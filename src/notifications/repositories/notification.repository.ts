import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  NotificationChannel,
  NotificationEntity,
  NotificationEvent,
  NotificationStatus,
  Prisma,
} from '@prisma/client';

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  createMany(rows: Prisma.NotificationCreateManyInput[]) {
    if (!rows?.length) return Promise.resolve({ count: 0 });
    return this.prisma.notification.createMany({
      data: rows,
      skipDuplicates: true,
    });
  }

  listInbox(
    userId: string,
    q: {
      status?: NotificationStatus;
      event?: NotificationEvent;
      page: number;
      pageSize: number;
      search?: string;
    },
  ) {
    const where: any = { recipientId: userId, isActive: true };
    if (q.status) where.status = q.status;
    if (q.event) where.event = q.event;
    if (q.search) {
      where.OR = [
        { title: { contains: q.search, mode: 'insensitive' } },
        { message: { contains: q.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.prisma.notification.count({ where }),
    ]);
  }

  async markRead(id: string, userId: string) {
    const n = await this.prisma.notification.findUnique({ where: { id } });
    if (!n || n.recipientId !== userId) return null;
    return this.prisma.notification.update({
      where: { id },
      data: { status: 'READ', readAt: new Date(), updatedBy: userId },
    });
  }

  findPendingByChannel(channel: NotificationChannel, limit = 200) {
    return this.prisma.notification.findMany({
      where: {
        isActive: true,
        status: 'PEN',
        scheduledAt: { lte: new Date() },
        channel,
      },
      orderBy: [{ scheduledAt: 'asc' }],
      take: limit,
    });
  }

  markSent(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { status: 'SENT', sentAt: new Date() },
    });
  }

  findRecipientEmail(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
  }

  async expireScheduledBy(
    entityType: NotificationEntity,
    entityId: string,
    events: NotificationEvent[],
  ) {
    // Esto evita que el índice único + dedupeKey bloquee nuevas notificaciones
    // cuando se vuelve a una fecha anterior.
    return this.prisma.notification.deleteMany({
      where: {
        entityType,
        entityId,
        event: { in: events },
        status: NotificationStatus.PEN, // solo las pendientes
        isActive: true,
      },
    });
  }

  existsByUnique(params: {
    recipientId: string;
    entityType: NotificationEntity;
    entityId: string;
    event: NotificationEvent;
    channel: NotificationChannel;
    dedupeKey: string;
  }) {
    return this.prisma.notification
      .findUnique({
        where: {
          recipientId_entityType_entityId_event_channel_dedupeKey: params,
        },
        select: { id: true },
      })
      .then((r) => !!r);
  }

  /**
   * Elimina físicamente notificaciones programadas (PEN) para una entidad,
   * filtrando adicionalmente por un subconjunto de datos en el `payload`.
   * Ideal para eliminar notificaciones de `OBJECTIVE_GOAL` para un mes/año específico.
   */
  async deleteScheduledByPayload(args: {
    entityType: NotificationEntity;
    entityId: string;
    payloadMatch: Prisma.InputJsonValue;
    events?: NotificationEvent[];
  }) {
    const where: Prisma.NotificationWhereInput = {
      entityType: args.entityType,
      entityId: args.entityId,
      status: NotificationStatus.PEN,
      payload: {
        equals: args.payloadMatch,
      },
    };

    if (args.events?.length) {
      where.event = { in: args.events };
    }

    // Usamos deleteMany para eliminar completamente los registros.
    return this.prisma.notification.deleteMany({
      where,
    });
  }

  /**
   * Actualiza título, mensaje y payload de una notificación
   * identificada por su clave compuesta + dedupeKey.
   * Se usa para eventos inmediatos (ASSIGNED / UPDATED / COMPLETED),
   * para que el contenido siempre refleje el último cambio del día.
   */
  async updateContentByUnique(args: {
    recipientId: string;
    entityType: NotificationEntity;
    entityId: string;
    event: NotificationEvent;
    channel: NotificationChannel;
    dedupeKey: string;
    title: string;
    message: string;
    payload: Prisma.InputJsonValue;
  }): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: {
        recipientId: args.recipientId,
        entityType: args.entityType,
        entityId: args.entityId,
        event: args.event,
        channel: args.channel,
        dedupeKey: args.dedupeKey,
        isActive: true,
        status: {
          in: ['SENT', 'READ'],
        },
      },
      data: {
        title: args.title,
        message: args.message,
        payload: args.payload,
        status: 'SENT',
        readAt: null,
        updatedAt: new Date(),
      },
    });

    return result.count;
  }

  /**
   * Refresca título, mensaje y payload de TODAS las notificaciones
   * programadas (PEN) activas para una entidad.
   * Útil cuando cambia solo el nombre de la prioridad.
   */
  async refreshScheduledMetadataForEntity(params: {
    entityType: NotificationEntity;
    entityId: string;
    event: NotificationEvent;
    title: string;
    message: string;
    payload: Prisma.InputJsonValue;
  }) {
    return this.prisma.notification.updateMany({
      where: {
        entityType: params.entityType,
        entityId: params.entityId,
        event: params.event,
        status: NotificationStatus.PEN,
        isActive: true,
      },
      data: {
        title: params.title,
        message: params.message,
        payload: params.payload,
      },
    });
  }
}
