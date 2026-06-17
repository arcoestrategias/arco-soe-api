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
import { PERMISSIONS } from 'src/common/constants/permissions.constant';

@Injectable()
export class MeetingsService {
  constructor(
    private readonly meetingsRepo: MeetingsRepository,
    private readonly prisma: PrismaService,
    private readonly permissionValidator: PermissionValidatorService,
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
      orderBy: [
        { user: { lastName: 'asc' } },
        { user: { firstName: 'asc' } },
      ],
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
      parent: parentId
        ? { connect: { id: parentId } }
        : undefined,
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

    return meeting;
  }

  async update(meetingId: string, dto: UpdateMeetingDto, actorId: string) {
    const meeting = await this.meetingsRepo.findById(meetingId);
    if (!meeting) {
      throw new NotFoundException('Reunión no encontrada.');
    }

    if (meeting.status === MeetingStatus.CANCELLED) {
      throw new BadRequestException('No se puede editar una reunión cancelada.');
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

    const { participants, companyId, businessUnitId, applyToGroup, ...updateData } = dto;

    const dataToUpdate: any = {
      ...updateData,
      ...(updateData.startDate ? { startDate: new Date(updateData.startDate) } : {}),
      ...(updateData.endDate ? { endDate: new Date(updateData.endDate) } : {}),
      updatedBy: actorId,
    };

    if (participants) {
      dataToUpdate.participants = {
        deleteMany: {},
        create: participants.map((p) => ({ ...p, createdBy: actorId })),
      };
    }

    return this.meetingsRepo.update(meetingId, dataToUpdate);
  }

  async remove(meetingId: string, actorId: string) {
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

    await this.meetingsRepo.prisma.meeting.update({
      where: { id: meetingId },
      data: { status: MeetingStatus.CANCELLED, updatedBy: actorId },
    });
  }

  // ---- Helper methods ----

  private isSameDay(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
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

      // Truncate time for comparison
      const truncated = new Date(current);
      truncated.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

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
    const { parent, siblings } = await this.meetingsRepo.findParentAndSiblings(parentId);
    if (!parent) {
      throw new NotFoundException('Reunión padre no encontrada.');
    }

    // Determine range end = max startDate among all group meetings
    const allMeetings = [parent as any, ...siblings];
    const maxDate = new Date(
      Math.max(...allMeetings.map((m: any) => new Date(m.startDate).getTime())),
    );

    const now = new Date();
    const newFrequency = dto.frequency;
    const currentFrequency = meeting.frequency ?? 'ONCE';
    const frequencyChanged = newFrequency && newFrequency !== currentFrequency;

    const payloadStartDate = dto.startDate ? new Date(dto.startDate) : null;
    const payloadEndDate = dto.endDate ? new Date(dto.endDate) : null;

    if (frequencyChanged) {
      // ---- RECALCULATE CHILDREN WITH NEW FREQUENCY ----
      const expectedDates = this.generateExpectedDates(
        new Date(parent.startDate),
        newFrequency!,
        maxDate,
      );

      // Process existing siblings
      for (const child of siblings) {
        const childStart = new Date(child.startDate);
        const hasMinutes = (child as any)._count?.minutes > 0;

        // Skip past meetings or meetings with minutes
        if (childStart < now || hasMinutes) continue;

        const matchingDate = expectedDates.find((ed) =>
          this.isSameDay(ed, childStart),
        );

        if (matchingDate) {
          // Keep this meeting, update fields
          const updatePayload: any = {};
          if (dto.name) updatePayload.name = dto.name;
          if (dto.purpose !== undefined) updatePayload.purpose = dto.purpose;
          if (dto.location !== undefined) updatePayload.location = dto.location;
          if (dto.tools !== undefined) updatePayload.tools = dto.tools;
          if (dto.agenda !== undefined) updatePayload.agenda = dto.agenda;
          if (dto.participants) {
            updatePayload.participants = {
              deleteMany: {},
              create: dto.participants.map((p: any) => ({ ...p, createdBy: actorId })),
            };
          }
          if (payloadStartDate && payloadEndDate) {
            const newStart = this.applyTimeToDate(childStart, payloadStartDate);
            const duration = payloadEndDate.getTime() - payloadStartDate.getTime();
            updatePayload.startDate = newStart;
            updatePayload.endDate = new Date(newStart.getTime() + duration);
          }
          updatePayload.updatedBy = actorId;
          await this.meetingsRepo.update(child.id, updatePayload);
        } else {
          // Cancel this meeting (doesn't fit new frequency)
          await this.meetingsRepo.update(child.id, {
            status: MeetingStatus.CANCELLED,
            updatedBy: actorId,
          });
        }
      }

      // Create new children for expected dates that don't exist yet
      for (const ed of expectedDates) {
        // Skip parent's own date
        if (this.isSameDay(ed, new Date(parent.startDate))) continue;

        // Check if a child (kept or existing) already occupies this date
        const alreadyExists = siblings.some((s: any) =>
          this.isSameDay(new Date(s.startDate), ed),
        );
        if (alreadyExists) continue;

        // Don't create past meetings
        if (ed < now) continue;

        const childStart = payloadStartDate
          ? this.applyTimeToDate(ed, payloadStartDate)
          : ed;
        const duration = payloadStartDate && payloadEndDate
          ? payloadEndDate.getTime() - payloadStartDate.getTime()
          : 3600000;
        const childEnd = new Date(childStart.getTime() + duration);

        const participantsToCreate = dto.participants
          ?? (meeting as any).participants
          ?? [];

        await this.meetingsRepo.create({
          name: dto.name ?? parent.name,
          purpose: dto.purpose ?? parent.purpose,
          location: dto.location ?? parent.location,
          tools: dto.tools ?? parent.tools,
          startDate: childStart,
          endDate: childEnd,
          agenda: dto.agenda ?? ((parent.agenda as any) ?? []),
          frequency: newFrequency!,
          company: { connect: { id: parent.companyId } },
          businessUnit: parent.businessUnitId
            ? { connect: { id: parent.businessUnitId } }
            : undefined,
          parent: { connect: { id: parent.id } },
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

      // Update parent's frequency
      if (newFrequency) {
        await this.meetingsRepo.update(parent.id, {
          frequency: newFrequency,
          updatedBy: actorId,
        });
      }
    } else {
      // ---- FREQUENCY DIDN'T CHANGE - just update time for future siblings ----
      for (const child of siblings) {
        const childStart = new Date(child.startDate);
        if (childStart < now) continue;

        const updatePayload: any = {};
        if (dto.name) updatePayload.name = dto.name;
        if (dto.purpose !== undefined) updatePayload.purpose = dto.purpose;
        if (dto.location !== undefined) updatePayload.location = dto.location;
        if (dto.tools !== undefined) updatePayload.tools = dto.tools;
        if (dto.agenda !== undefined) updatePayload.agenda = dto.agenda;
        if (dto.participants) {
          updatePayload.participants = {
            deleteMany: {},
            create: dto.participants.map((p: any) => ({ ...p, createdBy: actorId })),
          };
        }
        if (payloadStartDate && payloadEndDate) {
          const newStart = this.applyTimeToDate(childStart, payloadStartDate);
          const duration = payloadEndDate.getTime() - payloadStartDate.getTime();
          updatePayload.startDate = newStart;
          updatePayload.endDate = new Date(newStart.getTime() + duration);
        }
        updatePayload.updatedBy = actorId;
        await this.meetingsRepo.update(child.id, updatePayload);
      }
    }

    // Also update the current meeting's own fields
    const meetingUpdate: any = { updatedBy: actorId };
    if (dto.name) meetingUpdate.name = dto.name;
    if (dto.purpose !== undefined) meetingUpdate.purpose = dto.purpose;
    if (dto.location !== undefined) meetingUpdate.location = dto.location;
    if (dto.tools !== undefined) meetingUpdate.tools = dto.tools;
    if (dto.agenda !== undefined) meetingUpdate.agenda = dto.agenda;
    if (dto.participants) {
      meetingUpdate.participants = {
        deleteMany: {},
        create: dto.participants.map((p: any) => ({ ...p, createdBy: actorId })),
      };
    }
    if (payloadStartDate && payloadEndDate) {
      meetingUpdate.startDate = payloadStartDate;
      meetingUpdate.endDate = payloadEndDate;
    }
    if (Object.keys(meetingUpdate).length > 1) {
      await this.meetingsRepo.update(meeting.id, meetingUpdate);
    }

    return this.meetingsRepo.findById(meeting.id);
  }
}
