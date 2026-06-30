import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MeetingsRepository } from '../repositories/meetings.repository';
import { MeetingStatus } from '@prisma/client';
import { UpdateMeetingDto } from '../dto/update-meeting.dto';
import { CreateMeetingDto } from '../dto/create-meeting.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { PermissionValidatorService } from 'src/core/services/permission-validator.service';
import { GoogleCalendarService } from 'src/google-calendar/google-calendar.service';
import { OutlookCalendarService } from 'src/outlook-calendar/outlook-calendar.service';
import { PERMISSIONS } from 'src/common/constants/permissions.constant';

@Injectable()
export class MeetingsService {
  constructor(
    private readonly meetingsRepo: MeetingsRepository,
    private readonly prisma: PrismaService,
    private readonly permissionValidator: PermissionValidatorService,
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly outlookCalendarService: OutlookCalendarService,
  ) {}

  async findCandidates(companyId: string) {
    const businessUnits = await this.prisma.businessUnit.findMany({
      where: { companyId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    const memberships = await this.prisma.userBusinessUnit.findMany({
      where: { businessUnit: { companyId } },
      select: {
        businessUnitId: true,
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: [{ user: { lastName: 'asc' } }, { user: { firstName: 'asc' } }],
    });

    const usersByBU = new Map<string, typeof memberships>();
    for (const m of memberships) {
      if (!usersByBU.has(m.businessUnitId)) {
        usersByBU.set(m.businessUnitId, []);
      }
      usersByBU.get(m.businessUnitId)!.push(m);
    }

    return businessUnits
      .map((bu) => ({
        businessUnitId: bu.id,
        businessUnitName: bu.name,
        users: (usersByBU.get(bu.id) ?? []).map((m) => m.user),
      }))
      .filter((g) => g.users.length > 0);
  }

  async findOne(id: string) {
    const meeting = await this.meetingsRepo.findById(id);
    if (!meeting) throw new NotFoundException('Reunión no encontrada');
    return meeting;
  }

  async findMyMeetings(userId: string, companyId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isPlatformAdmin: true },
    });
    if (user?.isPlatformAdmin) {
      return this.meetingsRepo.findAllByCompanyWithMinutes(companyId);
    }
    return this.meetingsRepo.findUserMeetingsWithMinutes(userId, companyId);
  }

  async findSiblings(parentId: string) {
    return this.meetingsRepo.findSiblings(parentId);
  }

  async create(dto: CreateMeetingDto, actorId: string) {
    const { participants, companyId, parentId, ...meetingData } = dto;

    const convenerCount = participants.filter(
      (p) => p.role === 'CONVENER',
    ).length;
    if (convenerCount !== 1) {
      throw new BadRequestException('Debe haber exactamente un convocante.');
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (endDate <= startDate) {
      throw new BadRequestException(
        'La fecha de fin debe ser posterior a la fecha de inicio.',
      );
    }

    if (!companyId) {
      throw new BadRequestException('companyId es requerido');
    }

    const meeting = await this.meetingsRepo.create({
      name: meetingData.name,
      purpose: meetingData.purpose,
      location: meetingData.location,
      tools: meetingData.tools,
      startDate,
      endDate,
      agenda: meetingData.agenda ?? [],
      frequency: meetingData.frequency ?? 'ONCE',
      company: { connect: { id: companyId } },
      businessUnit: dto.businessUnitId
        ? { connect: { id: dto.businessUnitId } }
        : undefined,
      parent: parentId ? { connect: { id: parentId } } : undefined,
      creator: { connect: { id: actorId } },
      participants: {
        create: participants.map((p) => ({
          userId: p.userId,
          role: p.role,
          isRequired: p.isRequired,
          createdBy: actorId,
        })),
      },
    });

    this.syncToCalendars(actorId, meeting).catch(() => {});

    return meeting;
  }

  async update(meetingId: string, dto: UpdateMeetingDto, actorId: string) {
    const meeting = await this.meetingsRepo.findById(meetingId);
    if (!meeting) throw new NotFoundException('Reunión no encontrada.');

    if (meeting.status === MeetingStatus.CANCELLED) {
      throw new BadRequestException(
        'No se puede editar una reunión cancelada.',
      );
    }

    const isConvener = (meeting as any).participants?.some(
      (p: any) => p.role === 'CONVENER' && p.userId === actorId,
    );
    const hasManagePermission = meeting.businessUnitId
      ? await this.permissionValidator.hasPermission(
          actorId,
          meeting.businessUnitId,
          PERMISSIONS.MEETINGS.MANAGE,
        )
      : false;

    if (!isConvener && !hasManagePermission) {
      throw new ForbiddenException(
        'Solo el convocante puede editar esta reunión.',
      );
    }

    if (dto.applyToGroup) {
      return this.handleGroupRecalculation(meeting, dto, actorId);
    }

    const {
      participants,
      companyId,
      businessUnitId,
      applyToGroup,
      repeatUntil,
      ...updateData
    } = dto;

    const dataToUpdate: any = {
      ...updateData,
      ...(updateData.startDate
        ? { startDate: new Date(updateData.startDate) }
        : {}),
      ...(updateData.endDate ? { endDate: new Date(updateData.endDate) } : {}),
      updatedBy: actorId,
    };

    const isChild = !!meeting.parentId;

    let existingSiblings: any[] = [];
    if (isChild && repeatUntil) {
      existingSiblings = await this.meetingsRepo.findSiblings(
        meeting.parentId!,
      );
      dataToUpdate.parentId = null;
    } else if (dto.frequency === 'ONCE') {
      dataToUpdate.parentId = null;
    }

    if (participants) {
      dataToUpdate.participants = {
        deleteMany: {},
        create: participants.map((p) => ({ ...p, createdBy: actorId })),
      };
    }

    await this.meetingsRepo.update(meetingId, dataToUpdate);

    if (isChild && repeatUntil) {
      await this.createChildrenUntilRepeat(
        meeting,
        dto,
        repeatUntil,
        actorId,
        existingSiblings,
      );
    }

    const updatedMeeting = await this.meetingsRepo.findById(meetingId);

    const participantUsers = await this.prisma.user.findMany({
      where: {
        id: {
          in:
            (updatedMeeting as any).participants?.map((p: any) => p.userId) ??
            [],
        },
      },
      select: { email: true, firstName: true, lastName: true },
    });

    const calendarPayload = {
      name: (updatedMeeting as any).name,
      purpose: (updatedMeeting as any).purpose,
      location: (updatedMeeting as any).location,
      startDate: new Date((updatedMeeting as any).startDate),
      endDate: new Date((updatedMeeting as any).endDate),
      participants: participantUsers.map((u) => ({
        email: u.email,
        name: `${u.firstName} ${u.lastName}`,
      })),
    };

    if ((updatedMeeting as any)?.googleCalendarId) {
      this.googleCalendarService
        .updateEvent(
          actorId,
          (updatedMeeting as any).googleCalendarId,
          calendarPayload,
        )
        .catch(() => {});
    }
    if ((updatedMeeting as any)?.outlookCalendarId) {
      this.outlookCalendarService
        .updateEvent(
          actorId,
          (updatedMeeting as any).outlookCalendarId,
          calendarPayload,
        )
        .catch(() => {});
    }

    return updatedMeeting;
  }

  async remove(meetingId: string, actorId: string, applyToGroup?: boolean) {
    const meeting = await this.meetingsRepo.findById(meetingId);
    if (!meeting) throw new NotFoundException('Reunión no encontrada');

    const isConvener = (meeting as any).participants?.some(
      (p: any) => p.role === 'CONVENER' && p.userId === actorId,
    );
    const hasManagePermission = meeting.businessUnitId
      ? await this.permissionValidator.hasPermission(
          actorId,
          meeting.businessUnitId,
          PERMISSIONS.MEETINGS.MANAGE,
        )
      : false;

    if (!isConvener && !hasManagePermission) {
      throw new ForbiddenException(
        'Solo el convocante puede cancelar esta reunión.',
      );
    }

    if (applyToGroup) {
      return this.handleGroupCancellation(meeting, actorId);
    }

    const minutesCount = (meeting as any)._count?.minutes ?? 0;
    if (minutesCount > 0) {
      throw new BadRequestException(
        'No se puede eliminar una reunión que tiene actas.',
      );
    }

    if ((meeting as any).googleCalendarId) {
      this.googleCalendarService
        .cancelEvent(actorId, (meeting as any).googleCalendarId)
        .catch(() => {});
    }
    if ((meeting as any).outlookCalendarId) {
      this.outlookCalendarService
        .cancelEvent(actorId, (meeting as any).outlookCalendarId)
        .catch(() => {});
    }

    await this.meetingsRepo.prisma.meeting.update({
      where: { id: meetingId },
      data: { status: MeetingStatus.CANCELLED, updatedBy: actorId },
    });
  }

  // ── Calendar sync ─────────────────────────────────────────────────────────
  private async syncToCalendars(actorId: string, meeting: any) {
    const participantUsers = await this.prisma.user.findMany({
      where: {
        id: { in: meeting.participants?.map((p: any) => p.userId) ?? [] },
      },
      select: { email: true, firstName: true, lastName: true },
    });

    const participants = participantUsers.map((u) => ({
      email: u.email,
      name: `${u.firstName} ${u.lastName}`,
    }));

    const payload = {
      id: meeting.id,
      name: meeting.name,
      purpose: meeting.purpose,
      location: meeting.location,
      startDate: new Date(meeting.startDate),
      endDate: new Date(meeting.endDate),
      participants,
    };

    const googleConnected =
      await this.googleCalendarService.isConnected(actorId);
    if (googleConnected) {
      await this.googleCalendarService
        .createEvent(actorId, payload)
        .catch(() => {});
    }

    const outlookConnected =
      await this.outlookCalendarService.isConnected(actorId);
    if (outlookConnected) {
      await this.outlookCalendarService
        .createEvent(actorId, payload)
        .catch(() => {});
    }
  }

  private async syncSiblingUpdate(
    actorId: string,
    child: any,
    overrides: {
      name?: string;
      purpose?: string;
      location?: string;
      startDate?: Date;
      endDate?: Date;
    },
    participants: { email: string; name: string }[],
  ) {
    const calendarPayload = {
      name: overrides.name ?? child.name,
      purpose: overrides.purpose ?? child.purpose,
      location: overrides.location ?? child.location,
      startDate: overrides.startDate ?? new Date(child.startDate),
      endDate: overrides.endDate ?? new Date(child.endDate),
      participants,
    };

    if (child.googleCalendarId) {
      this.googleCalendarService
        .updateEvent(actorId, child.googleCalendarId, calendarPayload)
        .catch(() => {});
    }
    if (child.outlookCalendarId) {
      this.outlookCalendarService
        .updateEvent(actorId, child.outlookCalendarId, calendarPayload)
        .catch(() => {});
    }
  }

  private async syncSiblingCancel(actorId: string, child: any) {
    if (child.googleCalendarId) {
      this.googleCalendarService
        .cancelEvent(actorId, child.googleCalendarId)
        .catch(() => {});
    }
    if (child.outlookCalendarId) {
      this.outlookCalendarService
        .cancelEvent(actorId, child.outlookCalendarId)
        .catch(() => {});
    }
  }

  // ── Group helpers ──────────────────────────────────────────────────────────
  private async handleGroupCancellation(meeting: any, actorId: string) {
    const parentId = (meeting.parentId ?? meeting.id) as string;
    const { siblings } =
      await this.meetingsRepo.findParentAndSiblings(parentId);
    const meetingStart = new Date(meeting.startDate);

    for (const child of siblings) {
      const childStart = new Date(child.startDate);
      const hasMinutes = ((child as any)._count?.minutes ?? 0) > 0;

      if (child.id === meeting.id) continue;
      if (childStart < meetingStart || hasMinutes) continue;

      await this.meetingsRepo.update(child.id, {
        status: MeetingStatus.CANCELLED,
        updatedBy: actorId,
      });
      await this.syncSiblingCancel(actorId, child);
    }

    const meetingMinutes = (meeting as any)._count?.minutes ?? 0;
    if (meetingMinutes === 0) {
      await this.meetingsRepo.update(meeting.id, {
        status: MeetingStatus.CANCELLED,
        updatedBy: actorId,
      });
      await this.syncSiblingCancel(actorId, meeting);
    }
  }

  private isSameDay(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  private parseLocalDate(dateStr: string): Date {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  private applyTimeToDate(date: Date, timeSource: Date): Date {
    const result = new Date(date);
    result.setHours(
      timeSource.getHours(),
      timeSource.getMinutes(),
      timeSource.getSeconds(),
      timeSource.getMilliseconds(),
    );
    return result;
  }

  private generateExpectedDates(
    startDate: Date,
    frequency: string,
    endDate: Date,
  ): Date[] {
    const dates: Date[] = [new Date(startDate)];
    let current = new Date(startDate);

    while (true) {
      switch (frequency) {
        case 'DAILY':
          current = new Date(current);
          current.setDate(current.getDate() + 1);
          break;
        case 'WEEKLY':
          current = new Date(current);
          current.setDate(current.getDate() + 7);
          break;
        case 'BIWEEKLY':
          current = new Date(current);
          current.setDate(current.getDate() + 14);
          break;
        case 'MONTHLY':
          current = new Date(current);
          current.setMonth(current.getMonth() + 1);
          break;
        default:
          return dates;
      }

      const truncated = new Date(current);
      truncated.setHours(0, 0, 0, 0);
      const end = new Date(
        endDate.getFullYear(),
        endDate.getMonth(),
        endDate.getDate(),
        23,
        59,
        59,
        999,
      );

      if (truncated > end) break;
      dates.push(new Date(current));
    }

    return dates;
  }

  private async handleGroupRecalculation(
    meeting: any,
    dto: UpdateMeetingDto,
    actorId: string,
  ) {
    const parentId = (meeting.parentId ?? meeting.id) as string;
    const { parent, siblings } =
      await this.meetingsRepo.findParentAndSiblings(parentId);
    if (!parent) throw new NotFoundException('Reunión padre no encontrada.');

    const rangeEnd = dto.repeatUntil
      ? this.parseLocalDate(dto.repeatUntil)
      : new Date(
          Math.max(
            ...([parent as any, ...siblings] as any[]).map((m: any) =>
              new Date(m.startDate).getTime(),
            ),
          ),
        );

    const newFrequency = dto.frequency;
    const currentFrequency = meeting.frequency ?? 'ONCE';
    const frequencyChanged = newFrequency && newFrequency !== currentFrequency;
    const payloadStartDate = dto.startDate ? new Date(dto.startDate) : null;
    const payloadEndDate = dto.endDate ? new Date(dto.endDate) : null;

    // Pre-cargar participantes para sync de calendarios
    const participantIds =
      dto.participants?.map((p: any) => p.userId) ??
      (meeting as any).participants?.map((p: any) => p.userId) ??
      [];
    const participantUsers = await this.prisma.user
      .findMany({
        where: { id: { in: participantIds } },
        select: { email: true, firstName: true, lastName: true },
      })
      .then((users) =>
        users.map((u) => ({
          email: u.email,
          name: `${u.firstName} ${u.lastName}`,
        })),
      );

    if (frequencyChanged) {
      const meetingStart = new Date(meeting.startDate);
      const isChildEdit = !!meeting.parentId;
      const expectedDates = this.generateExpectedDates(
        meetingStart,
        newFrequency!,
        rangeEnd,
      );
      const isOnce = newFrequency === 'ONCE';

      for (const child of siblings) {
        const childStart = new Date(child.startDate);
        const hasMinutes = ((child as any)._count?.minutes ?? 0) > 0;

        if (child.id === meeting.id) continue;
        if (childStart < meetingStart || hasMinutes) continue;

        if (isOnce) {
          await this.meetingsRepo.update(child.id, {
            status: MeetingStatus.CANCELLED,
            updatedBy: actorId,
          });
          await this.syncSiblingCancel(actorId, child);
          continue;
        }

        const matchingDate = expectedDates.find((ed) =>
          this.isSameDay(ed, childStart),
        );

        if (matchingDate) {
          const updatePayload: any = { frequency: newFrequency };
          if (isChildEdit) updatePayload.parentId = meeting.id;
          if (dto.name) updatePayload.name = dto.name;
          if (dto.purpose !== undefined) updatePayload.purpose = dto.purpose;
          if (dto.location !== undefined) updatePayload.location = dto.location;
          if (dto.tools !== undefined) updatePayload.tools = dto.tools;
          if (dto.agenda !== undefined) updatePayload.agenda = dto.agenda;
          if (dto.participants) {
            updatePayload.participants = {
              deleteMany: {},
              create: dto.participants.map((p: any) => ({
                ...p,
                createdBy: actorId,
              })),
            };
          }
          if (payloadStartDate && payloadEndDate) {
            const newStart = this.applyTimeToDate(childStart, payloadStartDate);
            const duration =
              payloadEndDate.getTime() - payloadStartDate.getTime();
            updatePayload.startDate = newStart;
            updatePayload.endDate = new Date(newStart.getTime() + duration);
          }
          updatePayload.updatedBy = actorId;
          await this.meetingsRepo.update(child.id, updatePayload);
          await this.syncSiblingUpdate(
            actorId,
            child,
            {
              name: updatePayload.name,
              purpose: updatePayload.purpose,
              location: updatePayload.location,
              startDate: updatePayload.startDate,
              endDate: updatePayload.endDate,
            },
            participantUsers,
          );
        } else {
          await this.meetingsRepo.update(child.id, {
            status: MeetingStatus.CANCELLED,
            updatedBy: actorId,
          });
          await this.syncSiblingCancel(actorId, child);
        }
      }

      if (!isOnce) {
        const newParentId = isChildEdit ? meeting.id : parent.id;
        for (const ed of expectedDates) {
          if (this.isSameDay(ed, new Date(meeting.startDate))) continue;
          const alreadyExists = siblings.some((s: any) =>
            this.isSameDay(new Date(s.startDate), ed),
          );
          if (alreadyExists) continue;
          if (ed < new Date(meeting.startDate)) continue;

          const childStart = payloadStartDate
            ? this.applyTimeToDate(ed, payloadStartDate)
            : ed;
          const duration =
            payloadStartDate && payloadEndDate
              ? payloadEndDate.getTime() - payloadStartDate.getTime()
              : 3600000;
          const childEnd = new Date(childStart.getTime() + duration);
          const participantsToCreate =
            dto.participants ?? (meeting as any).participants ?? [];

          await this.meetingsRepo.create({
            name: dto.name ?? parent.name,
            purpose: dto.purpose ?? parent.purpose,
            location: dto.location ?? parent.location,
            tools: dto.tools ?? parent.tools,
            startDate: childStart,
            endDate: childEnd,
            agenda: dto.agenda ?? (parent.agenda as any) ?? [],
            frequency: newFrequency!,
            company: { connect: { id: parent.companyId } },
            businessUnit: parent.businessUnitId
              ? { connect: { id: parent.businessUnitId } }
              : undefined,
            parent: { connect: { id: newParentId } },
            creator: { connect: { id: actorId } },
            participants: {
              create: participantsToCreate.map((p: any) => ({
                userId: p.userId,
                role: p.role,
                isRequired: p.isRequired,
                createdBy: actorId,
              })),
            },
          });
        }
      }

      if (newFrequency && !isChildEdit) {
        await this.meetingsRepo.update(parent.id, {
          frequency: newFrequency,
          updatedBy: actorId,
        });
      }
    } else {
      const meetingStart = new Date(meeting.startDate);
      for (const child of siblings) {
        const childStart = new Date(child.startDate);
        if (child.id === meeting.id) continue;
        if (childStart < meetingStart) continue;

        const updatePayload: any = {};
        if (dto.name) updatePayload.name = dto.name;
        if (dto.purpose !== undefined) updatePayload.purpose = dto.purpose;
        if (dto.location !== undefined) updatePayload.location = dto.location;
        if (dto.tools !== undefined) updatePayload.tools = dto.tools;
        if (dto.agenda !== undefined) updatePayload.agenda = dto.agenda;
        if (dto.participants) {
          updatePayload.participants = {
            deleteMany: {},
            create: dto.participants.map((p: any) => ({
              ...p,
              createdBy: actorId,
            })),
          };
        }
        if (payloadStartDate && payloadEndDate) {
          const newStart = this.applyTimeToDate(childStart, payloadStartDate);
          const duration =
            payloadEndDate.getTime() - payloadStartDate.getTime();
          updatePayload.startDate = newStart;
          updatePayload.endDate = new Date(newStart.getTime() + duration);
        }
        updatePayload.updatedBy = actorId;
        await this.meetingsRepo.update(child.id, updatePayload);
        await this.syncSiblingUpdate(
          actorId,
          child,
          {
            name: updatePayload.name,
            purpose: updatePayload.purpose,
            location: updatePayload.location,
            startDate: updatePayload.startDate,
            endDate: updatePayload.endDate,
          },
          participantUsers,
        );
      }

      if (dto.repeatUntil && newFrequency) {
        const repeatUntilDate = this.parseLocalDate(dto.repeatUntil);
        const maxSiblingDate =
          siblings.length > 0
            ? new Date(
                Math.max(
                  ...siblings.map((s: any) => new Date(s.startDate).getTime()),
                ),
              )
            : meetingStart;

        if (repeatUntilDate > maxSiblingDate) {
          const expectedDates = this.generateExpectedDates(
            meetingStart,
            newFrequency,
            repeatUntilDate,
          );
          const newParentId = meeting.parentId ? meeting.id : parent.id;

          for (const ed of expectedDates) {
            if (this.isSameDay(ed, meetingStart)) continue;
            const alreadyExists = siblings.some((s: any) =>
              this.isSameDay(new Date(s.startDate), ed),
            );
            if (alreadyExists) continue;
            if (ed < meetingStart) continue;

            const childStart = payloadStartDate
              ? this.applyTimeToDate(ed, payloadStartDate)
              : new Date(ed);
            const duration =
              payloadStartDate && payloadEndDate
                ? payloadEndDate.getTime() - payloadStartDate.getTime()
                : 3600000;
            const childEnd = new Date(childStart.getTime() + duration);
            const participantsToCreate =
              dto.participants ?? (meeting as any).participants ?? [];

            await this.meetingsRepo.create({
              name: dto.name ?? parent.name,
              purpose: dto.purpose ?? parent.purpose,
              location: dto.location ?? parent.location,
              tools: dto.tools ?? parent.tools,
              startDate: childStart,
              endDate: childEnd,
              agenda: dto.agenda ?? (parent.agenda as any) ?? [],
              frequency: newFrequency,
              company: { connect: { id: parent.companyId } },
              businessUnit: parent.businessUnitId
                ? { connect: { id: parent.businessUnitId } }
                : undefined,
              parent: { connect: { id: newParentId } },
              creator: { connect: { id: actorId } },
              participants: {
                create: participantsToCreate.map((p: any) => ({
                  userId: p.userId,
                  role: p.role,
                  isRequired: p.isRequired,
                  createdBy: actorId,
                })),
              },
            });
          }
        }
      }
    }

    // Actualizar la reunión editada
    const meetingUpdate: any = { updatedBy: actorId };
    if (dto.frequency) meetingUpdate.frequency = dto.frequency;
    if (dto.name) meetingUpdate.name = dto.name;
    if (dto.purpose !== undefined) meetingUpdate.purpose = dto.purpose;
    if (dto.location !== undefined) meetingUpdate.location = dto.location;
    if (dto.tools !== undefined) meetingUpdate.tools = dto.tools;
    if (dto.agenda !== undefined) meetingUpdate.agenda = dto.agenda;
    if (dto.participants) {
      meetingUpdate.participants = {
        deleteMany: {},
        create: dto.participants.map((p: any) => ({
          ...p,
          createdBy: actorId,
        })),
      };
    }
    if (payloadStartDate && payloadEndDate) {
      meetingUpdate.startDate = payloadStartDate;
      meetingUpdate.endDate = payloadEndDate;
    }
    if (newFrequency && meeting.parentId && frequencyChanged) {
      meetingUpdate.parentId = null;
    }
    if (Object.keys(meetingUpdate).length > 1) {
      await this.meetingsRepo.update(meeting.id, meetingUpdate);
    }

    const updatedMeeting = await this.meetingsRepo.findById(meeting.id);

    const calendarPayload = {
      name: (updatedMeeting as any).name,
      purpose: (updatedMeeting as any).purpose,
      location: (updatedMeeting as any).location,
      startDate: new Date((updatedMeeting as any).startDate),
      endDate: new Date((updatedMeeting as any).endDate),
      participants: participantUsers,
    };

    if ((updatedMeeting as any)?.googleCalendarId) {
      this.googleCalendarService
        .updateEvent(
          actorId,
          (updatedMeeting as any).googleCalendarId,
          calendarPayload,
        )
        .catch(() => {});
    }
    if ((updatedMeeting as any)?.outlookCalendarId) {
      this.outlookCalendarService
        .updateEvent(
          actorId,
          (updatedMeeting as any).outlookCalendarId,
          calendarPayload,
        )
        .catch(() => {});
    }

    return updatedMeeting;
  }

  private async createChildrenUntilRepeat(
    meeting: any,
    dto: UpdateMeetingDto,
    repeatUntil: string,
    actorId: string,
    existingSiblings: any[],
  ) {
    const meetingStart = new Date(meeting.startDate);
    const repeatUntilDate = this.parseLocalDate(repeatUntil);
    const frequency = dto.frequency ?? meeting.frequency ?? 'ONCE';
    if (frequency === 'ONCE') return;

    const maxSiblingDate =
      existingSiblings.length > 0
        ? new Date(
            Math.max(
              ...existingSiblings.map((s: any) =>
                new Date(s.startDate).getTime(),
              ),
            ),
          )
        : meetingStart;

    if (repeatUntilDate <= maxSiblingDate) return;

    const expectedDates = this.generateExpectedDates(
      meetingStart,
      frequency,
      repeatUntilDate,
    );
    const payloadStartDate = dto.startDate ? new Date(dto.startDate) : null;
    const payloadEndDate = dto.endDate ? new Date(dto.endDate) : null;

    for (const ed of expectedDates) {
      if (this.isSameDay(ed, meetingStart)) continue;
      if (ed < meetingStart) continue;

      const childStart = payloadStartDate
        ? this.applyTimeToDate(ed, payloadStartDate)
        : new Date(ed);
      const duration =
        payloadStartDate && payloadEndDate
          ? payloadEndDate.getTime() - payloadStartDate.getTime()
          : 3600000;
      const childEnd = new Date(childStart.getTime() + duration);
      const participantsToCreate =
        dto.participants ?? (meeting as any).participants ?? [];

      await this.meetingsRepo.create({
        name: dto.name ?? meeting.name,
        purpose: dto.purpose ?? meeting.purpose,
        location: dto.location ?? meeting.location,
        tools: dto.tools ?? meeting.tools,
        startDate: childStart,
        endDate: childEnd,
        agenda: dto.agenda ?? (meeting.agenda as any) ?? [],
        frequency,
        company: { connect: { id: meeting.companyId } },
        businessUnit: meeting.businessUnitId
          ? { connect: { id: meeting.businessUnitId } }
          : undefined,
        parent: { connect: { id: meeting.id } },
        creator: { connect: { id: actorId } },
        participants: {
          create: participantsToCreate.map((p: any) => ({
            userId: p.userId,
            role: p.role,
            isRequired: p.isRequired,
            createdBy: actorId,
          })),
        },
      });
    }
  }
}
