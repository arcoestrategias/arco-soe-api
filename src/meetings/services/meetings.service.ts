import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { addMonths, subDays } from 'date-fns';
import { CreateMeetingDto } from '../dto';
import { MeetingsRepository } from '../repositories/meetings.repository';
import { MeetingParticipantsRepository } from '../repositories/meeting-participants.repository';
import { MeetingOccurrencesRepository } from '../repositories/meeting-occurrences.repository';
import { RecurrenceService } from './recurrence.service';
import { MeetingParticipantRole, MeetingStatus } from '@prisma/client';
import { UpdateScope, UpdateMeetingDto } from '../dto/update-meeting.dto';
import { UsersRepository } from 'src/users/repositories/users.repository';

@Injectable()
export class MeetingsService {
  constructor(
    private readonly meetingsRepo: MeetingsRepository,
    private readonly participantsRepo: MeetingParticipantsRepository,
    private readonly occurrencesRepo: MeetingOccurrencesRepository,
    private readonly recurrenceService: RecurrenceService,
    private readonly usersRepo: UsersRepository,
  ) {}

  async findOne(id: string) {
    const meeting = await this.meetingsRepo.findById(id);
    if (!meeting) throw new NotFoundException('Reunión no encontrada');
    return meeting;
  }

  async findMyMeetings(userId: string, companyId: string) {
    return this.meetingsRepo.findUserMeetings(userId, companyId);
  }

  async create(dto: CreateMeetingDto, actorId: string) {
    const { participants, companyId, businessUnitId, ...meetingData } = dto;

    // Validación de negocio
    const convenerCount = participants.filter(
      (p) => p.role === MeetingParticipantRole.CONVENER,
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
      throw new BadRequestException('El companyId es obligatorio.');
    }

    // Validar que los participantes pertenezcan a la empresa
    const participantIds = participants.map((p) => p.userId);
    const uniqueParticipantIds = [...new Set(participantIds)];

    const invalidIds = await this.usersRepo.findInvalidUserIdsForCompany(
      uniqueParticipantIds,
      companyId,
    );

    if (invalidIds.length > 0) {
      throw new BadRequestException(
        `Los siguientes participantes no pertenecen a la empresa seleccionada (${companyId}): ${invalidIds.join(
          ', ',
        )}`,
      );
    }

    return this.meetingsRepo.prisma.$transaction(async (tx) => {
      // 1. Crear la serie de la reunión (Meeting)
      const meeting = await tx.meeting.create({
        data: {
          ...meetingData,
          companyId,
          businessUnitId,
          startDate,
          endDate,
          seriesEndDate: dto.seriesEndDate ? new Date(dto.seriesEndDate) : null,
          createdBy: actorId,
          updatedBy: actorId,
          daysOfWeek: dto.daysOfWeek,
        },
      });

      // 2. Crear los participantes
      const uniqueParticipants = Array.from(
        new Map(participants.map((p) => [p.userId, p])).values(),
      );
      await tx.meetingParticipant.createMany({
        data: uniqueParticipants.map((p) => ({
          meetingId: meeting.id,
          userId: p.userId,
          role: p.role,
          isRequired: p.isRequired,
          createdBy: actorId,
        })),
      });

      // 3. Generar ocurrencias
      // Asegurar que el horizonte cubra al menos 12 meses desde el inicio de la reunión o desde hoy
      const now = new Date();
      const horizonBase = startDate > now ? startDate : now;
      const horizon = addMonths(horizonBase, 12);
      const occurrences = this.recurrenceService.generateOccurrences(
        {
          ...meeting,
          seriesEndDate: meeting.seriesEndDate ?? undefined,
          dayValue: meeting.dayValue ?? undefined,
          daysOfWeek: meeting.daysOfWeek,
        },
        horizon,
      );

      if (occurrences.length > 0) {
        await tx.meetingOccurrence.createMany({
          data: occurrences.map((occ) => ({
            meetingId: meeting.id,
            startDate: occ.startDate,
            endDate: occ.endDate,
            updatedBy: actorId,
          })),
        });
      }

      return meeting;
    });
  }

  async update(meetingId: string, dto: UpdateMeetingDto, actorId: string) {
    const meeting = await this.meetingsRepo.findById(meetingId);
    if (!meeting) {
      throw new NotFoundException('Reunión no encontrada.');
    }

    if (meeting.status === MeetingStatus.CANCELLED) {
      throw new BadRequestException(
        'No se puede editar una reunión cancelada.',
      );
    }

    if (dto.scope === UpdateScope.THIS_AND_FUTURE) {
      return this.updateThisAndFuture(meeting, dto, actorId);
    } else if (dto.scope === UpdateScope.ONLY_THIS) {
      return this.updateOnlyThis(meeting, dto, actorId);
    }

    // Si no se especifica scope o es una reunión única, actualizamos la entidad base
    const { scope, occurrenceDate, participants, ...updateData } = dto;

    const dataToUpdate: any = {
      ...updateData,
      updatedBy: actorId,
    };

    if (participants) {
      dataToUpdate.participants = {
        deleteMany: {}, // Borramos los anteriores
        create: participants.map((p) => ({ ...p, createdBy: actorId })), // Creamos los nuevos
      };
    }
    return this.meetingsRepo.update(meetingId, dataToUpdate);
  }

  private async updateThisAndFuture(
    originalMeeting,
    dto: UpdateMeetingDto,
    actorId: string,
  ) {
    if (!dto.occurrenceDate) {
      throw new BadRequestException(
        'Se requiere `occurrenceDate` para editar esta y futuras ocurrencias.',
      );
    }

    const occurrenceDate = new Date(dto.occurrenceDate);

    return this.meetingsRepo.prisma.$transaction(async (tx) => {
      // 1. Acortar la serie original
      await tx.meeting.update({
        where: { id: originalMeeting.id },
        data: {
          seriesEndDate: subDays(occurrenceDate, 1),
          updatedBy: actorId,
        },
      });

      // 2. Eliminar ocurrencias futuras de la serie original
      await tx.meetingOccurrence.deleteMany({
        where: {
          meetingId: originalMeeting.id,
          startDate: { gte: occurrenceDate },
        },
      });

      // 3. Crear la nueva serie con los datos actualizados
      const { scope, occurrenceDate: _, participants, ...newMeetingData } = dto;
      const newStartDate = new Date(newMeetingData.startDate || occurrenceDate);
      const newEndDate = new Date(
        newMeetingData.endDate ||
          new Date(
            newStartDate.getTime() +
              (originalMeeting.endDate.getTime() -
                originalMeeting.startDate.getTime()),
          ),
      );

      // Limpiar originalMeeting para evitar copiar campos que no deben ir en el create
      const {
        id: _id,
        createdAt: _createdAt,
        updatedAt: _updatedAt,
        participants: _participants,
        occurrences: _occurrences,
        googleCalendarId: _googleCalendarId,
        outlookCalendarId: _outlookCalendarId,
        ...cleanOriginalMeeting
      } = originalMeeting;

      const newMeeting = await tx.meeting.create({
        data: {
          ...cleanOriginalMeeting, // Hereda propósito, herramientas, etc.
          ...newMeetingData, // Sobrescribe con los nuevos datos
          startDate: newStartDate,
          endDate: newEndDate,
          seriesEndDate: newMeetingData.seriesEndDate
            ? new Date(newMeetingData.seriesEndDate)
            : null,
          createdBy: actorId,
          updatedBy: actorId,
          googleCalendarId: null,
          outlookCalendarId: null,
          daysOfWeek: newMeetingData.daysOfWeek ?? cleanOriginalMeeting.daysOfWeek,
        },
      });

      // 4. Re-asignar participantes a la nueva serie
      if (participants) {
        await tx.meetingParticipant.createMany({
          data: participants.map((p) => ({
            meetingId: newMeeting.id,
            userId: p.userId,
            role: p.role,
            isRequired: p.isRequired,
            createdBy: actorId,
          })),
        });
      } else {
        const originalParticipants = await tx.meetingParticipant.findMany({
          where: { meetingId: originalMeeting.id },
        });
        await tx.meetingParticipant.createMany({
          data: originalParticipants.map((p) => ({
            meetingId: newMeeting.id,
            userId: p.userId,
            role: p.role,
            isRequired: p.isRequired,
            createdBy: actorId,
          })),
        });
      }

      // 5. Generar nuevas ocurrencias para la nueva serie
      const now = new Date();
      const horizonBase = newStartDate > now ? newStartDate : now;
      const horizon = addMonths(horizonBase, 12);
      const newOccurrences = this.recurrenceService.generateOccurrences(
        {
          ...newMeeting,
          seriesEndDate: newMeeting.seriesEndDate ?? undefined,
          dayValue: newMeeting.dayValue ?? undefined,
          daysOfWeek: newMeeting.daysOfWeek,
        },
        horizon,
      );
      if (newOccurrences.length > 0) {
        await tx.meetingOccurrence.createMany({
          data: newOccurrences.map((occ) => ({
            meetingId: newMeeting.id,
            startDate: occ.startDate,
            endDate: occ.endDate,
            updatedBy: actorId,
          })),
        });
      }

      return newMeeting;
    });
  }

  private async updateOnlyThis(
    originalMeeting: any,
    dto: UpdateMeetingDto,
    actorId: string,
  ) {
    if (!dto.occurrenceDate) {
      throw new BadRequestException(
        'Se requiere `occurrenceDate` para editar una ocurrencia específica.',
      );
    }
    const occurrenceDate = new Date(dto.occurrenceDate);

    return this.meetingsRepo.prisma.$transaction(async (tx) => {
      // 1. Buscar la ocurrencia original para cancelarla
      const occurrence = await tx.meetingOccurrence.findUnique({
        where: {
          meetingId_startDate: {
            meetingId: originalMeeting.id,
            startDate: occurrenceDate,
          },
        },
      });

      if (!occurrence) {
        throw new NotFoundException(
          'No se encontró la ocurrencia en la fecha especificada.',
        );
      }

      // 2. Cancelar la ocurrencia original (Soft Delete de la instancia)
      await tx.meetingOccurrence.update({
        where: { id: occurrence.id },
        data: { isCancelled: true, updatedBy: actorId },
      });

      // 3. Crear una NUEVA reunión tipo ONCE (Excepción)
      const { scope, occurrenceDate: _, participants, ...newData } = dto;

      const newStartDate = newData.startDate
        ? new Date(newData.startDate)
        : occurrence.startDate;
      const newEndDate = newData.endDate
        ? new Date(newData.endDate)
        : occurrence.endDate;

      // Limpiar originalMeeting para evitar copiar campos que no deben ir en el create
      const {
        id: _id,
        createdAt: _createdAt,
        updatedAt: _updatedAt,
        participants: _participants,
        occurrences: _occurrences,
        googleCalendarId: _googleCalendarId,
        outlookCalendarId: _outlookCalendarId,
        ...cleanOriginalMeeting
      } = originalMeeting;

      const newMeeting = await tx.meeting.create({
        data: {
          ...cleanOriginalMeeting,
          ...newData,
          frequency: 'ONCE',
          startDate: newStartDate,
          endDate: newEndDate,
          seriesEndDate: null,
          dayValue: null,
          createdBy: actorId,
          updatedBy: actorId,
          googleCalendarId: null,
          outlookCalendarId: null,
          daysOfWeek: null, // Una excepción ONCE no tiene días de semana múltiples
        },
      });

      // 4. Copiar participantes a la nueva reunión de excepción
      if (participants) {
        await tx.meetingParticipant.createMany({
          data: participants.map((p) => ({
            meetingId: newMeeting.id,
            userId: p.userId,
            role: p.role,
            isRequired: p.isRequired,
            createdBy: actorId,
          })),
        });
      } else {
        const originalParticipants = await tx.meetingParticipant.findMany({
          where: { meetingId: originalMeeting.id },
        });

        if (originalParticipants.length > 0) {
          await tx.meetingParticipant.createMany({
            data: originalParticipants.map((p) => ({
              meetingId: newMeeting.id,
              userId: p.userId,
              role: p.role,
              isRequired: p.isRequired,
              createdBy: actorId,
            })),
          });
        }
      }

      // 5. Generar la ocurrencia única para la nueva reunión
      await tx.meetingOccurrence.create({
        data: {
          meetingId: newMeeting.id,
          startDate: newStartDate,
          endDate: newEndDate,
          updatedBy: actorId,
        },
      });

      return newMeeting;
    });
  }

  async remove(
    meetingId: string,
    scope: 'SERIES' | 'ONLY_THIS',
    occurrenceDate: string | undefined,
    actorId: string,
  ) {
    const meeting = await this.meetingsRepo.findById(meetingId);
    if (!meeting) throw new NotFoundException('Reunión no encontrada');

    if (scope === 'ONLY_THIS') {
      if (!occurrenceDate) {
        throw new BadRequestException(
          'Se requiere `occurrenceDate` para cancelar una ocurrencia.',
        );
      }
      const date = new Date(occurrenceDate);

      const occurrence =
        await this.occurrencesRepo.prisma.meetingOccurrence.findUnique({
          where: {
            meetingId_startDate: {
              meetingId,
              startDate: date,
            },
          },
        });

      if (!occurrence) throw new NotFoundException('Ocurrencia no encontrada');
      if (occurrence.isExecuted) {
        throw new BadRequestException(
          'No se puede cancelar una reunión ya ejecutada.',
        );
      }

      await this.occurrencesRepo.prisma.meetingOccurrence.update({
        where: { id: occurrence.id },
        data: { isCancelled: true, updatedBy: actorId },
      });
    } else {
      await this.meetingsRepo.prisma.$transaction([
        this.meetingsRepo.prisma.meeting.update({
          where: { id: meetingId },
          data: { status: MeetingStatus.CANCELLED, updatedBy: actorId },
        }),
        this.occurrencesRepo.prisma.meetingOccurrence.updateMany({
          where: {
            meetingId,
            isExecuted: false,
            startDate: { gte: new Date() },
          },
          data: { isCancelled: true, updatedBy: actorId },
        }),
      ]);
    }
  }

  async markOccurrenceAsExecuted(
    occurrenceId: string,
    actorId: string,
  ): Promise<void> {
    const occurrence =
      await this.occurrencesRepo.prisma.meetingOccurrence.findUnique({
        where: { id: occurrenceId },
        include: { meeting: true }, // Para validar permisos si fuera necesario
      });

    if (!occurrence) {
      throw new NotFoundException('Ocurrencia de reunión no encontrada.');
    }

    if (occurrence.isExecuted) {
      // Opcional: lanzar error o simplemente retornar si ya estaba ejecutada
      return;
    }

    await this.occurrencesRepo.prisma.meetingOccurrence.update({
      where: { id: occurrenceId },
      data: {
        isExecuted: true,
        updatedBy: actorId,
      },
    });
  }
}
