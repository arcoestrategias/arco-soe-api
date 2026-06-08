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
    return this.meetingsRepo.findUserMeetings(userId, companyId);
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

    const { participants, companyId, businessUnitId, ...updateData } = dto;

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
}
