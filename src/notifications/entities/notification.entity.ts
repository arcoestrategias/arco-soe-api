import { Notification as PrismaNotification } from '@prisma/client';

export class NotificationEntity {
  constructor(private readonly n: PrismaNotification) {}

  toResponse() {
    return {
      id: this.n.id,
      companyId: this.n.companyId,
      businessUnitId: this.n.businessUnitId,
      recipientId: this.n.recipientId,
      entityType: this.n.entityType,
      entityId: this.n.entityId,
      event: this.n.event,
      channel: this.n.channel,
      title: this.n.title,
      message: this.n.message,
      payload: this.n.payload,
      status: this.n.status,
      scheduledAt: this.n.scheduledAt,
      sentAt: this.n.sentAt,
      readAt: this.n.readAt,
      expiresAt: this.n.expiresAt,
      createdAt: this.n.createdAt,
    };
  }
}
