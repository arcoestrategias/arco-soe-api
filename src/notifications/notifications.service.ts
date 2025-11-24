import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import { MailService } from 'src/mail/mail.service';
import { NotificationTemplateRepository } from './repositories/notification-template.repository';
import { NotificationRepository } from './repositories/notification.repository';
import {
  NotificationChannel,
  Notification,
  NotificationEntity as NEntity,
  NotificationEvent,
  NotificationStatus,
  Prisma,
} from '@prisma/client';
import { NotificationEntity as ResponseEntity } from './entities/notification.entity';
import { createHash } from 'crypto';

/** Milisegundos de un día (para restar días a fechas con claridad). */
const DAY_MS = 86_400_000;
/**
 * Parámetros base para crear cualquier tipo de notificación.
 * El canal se determina dentro del servicio.
 */
type CreateNotificationParams = {
  companyId: string;
  businessUnitId: string;
  recipientId: string;
  entityType: NEntity;
  entityId: string;
  event: NotificationEvent;
  variables?: Record<string, any>;
  // Para notificaciones programadas (opcional para las inmediatas)
  runAt?: Date;
};

/** Parámetros para reprogramar cuando cambia la fecha (untilAt). */
type RescheduleArgs = {
  entityType: NEntity;
  entityId: string;
  companyId: string;
  businessUnitId: string;
  recipientId: string;
  oldDate: Date;
  newDate: Date;
  variables?: Record<string, any>;
};

/** Parámetros de consulta del inbox. */
type InboxQuery = {
  status?: NotificationStatus;
  event?: NotificationEvent;
  page: number;
  pageSize: number;
  search?: string;
};

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly mail: MailService,
    private readonly templates: NotificationTemplateRepository,
    private readonly notifRepo: NotificationRepository,
  ) {}

  /**
   * Procesa y envía notificaciones programadas cuyo `scheduledAt` ya pasó.
   * Este método es invocado por el NotificationsScheduler.
   * SE ENFOCA SOLO EN NOTIFICACIONES IN-APP.
   */
  async processPendingScheduledNotifications(): Promise<number> {
    const pendingNotifications = await this.notifRepo.findPendingByChannel(
      NotificationChannel.IN_APP,
      200,
    );

    if (!pendingNotifications.length) {
      return 0;
    }

    this.logger.debug(
      `Procesando ${pendingNotifications.length} notificaciones programadas IN-APP`,
    );

    for (const notification of pendingNotifications) {
      try {
        // La "entrega" de IN_APP es simplemente marcarla como SENT.
        // La UI del cliente las recuperará del inbox.
        // Si tuvieras WebSockets, aquí emitirías el evento.
        this.logger.log(
          `Marcando como SENT notificación IN-APP ${notification.id} para ${notification.recipientId}`,
        );

        // Actualizar la notificación a 'SENT'
        await this.notifRepo.markSent(notification.id);
      } catch (error) {
        this.logger.error(
          `Fallo al procesar notificación IN-APP ${notification.id}`,
          error,
        );
      }
    }

    return pendingNotifications.length;
  }

  /**
   * Procesa y envía notificaciones por EMAIL programadas.
   * Invocado por un scheduler/cron job.
   */
  async processPendingEmailNotifications(): Promise<number> {
    const pendingNotifications = await this.notifRepo.findPendingByChannel(
      NotificationChannel.EMAIL,
      50, // Un batch más pequeño para emails
    );

    if (!pendingNotifications.length) return 0;

    this.logger.debug(
      `Procesando ${pendingNotifications.length} notificaciones por EMAIL`,
    );

    for (const notification of pendingNotifications) {
      try {
        const recipient = await this.notifRepo.findRecipientEmail(
          notification.recipientId,
        );
        if (!recipient?.email) {
          throw new Error('Destinatario sin email');
        }

        const isDueNotification =
          notification.event === 'DUE_SOON' || notification.event === 'OVERDUE';

        // Si es una notificación de vencimiento, usamos la plantilla.
        // De lo contrario, se podría implementar una lógica para otras plantillas o un correo simple.
        if (isDueNotification) {
          const payload = notification.payload as Record<string, any>;
          const templateVars = {
            title: notification.title,
            statusText: this.getStatusTextForEvent(notification.event),
            name: payload.name,
            dueDate: this.formatDate(payload.dueDate),
            // TODO: Reemplazar con la URL real de la página de ayuda/contacto
            contact: process.env.APP_FRONTEND_URL ?? '#',
          };

          await this.sendByCode({
            codeTemplate: 'T06',
            to: recipient.email,
            variables: templateVars,
          });
        } else {
          // Para otros tipos de notificaciones por email, podríamos enviar un correo simple.
          await this.mail.send({
            to: recipient.email,
            subject: notification.title,
            html: notification.message,
          });
        }

        await this.notifRepo.markSent(notification.id);
      } catch (error) {
        this.logger.error(
          `Fallo al enviar email para notificación ${notification.id}`,
          error,
        );
        // Opcional: Actualizar la notificación a 'FLD' (Failed) para no reintentar
        // await this.notifRepo.update(notification.id, { status: 'FLD' });
      }
    }

    return pendingNotifications.length;
  }

  // ============================
  // SECCIÓN: EMAIL POR PLANTILLAS
  // ============================

  /**
   * Envía un correo basándose en un código de plantilla almacenado en BD.
   * - Compila subject y html con Handlebars usando `variables`.
   * - Delegado a MailService (SMTP/Nodemailer).
   */
  async sendByCode(params: {
    codeTemplate: string; // ej: 'ACC', 'T01', etc.
    to: string | string[];
    variables?: Record<string, any>; // p.ej. { firstname: 'Ana', link: '...' }
    from?: string;
  }) {
    const tpl = await this.templates.findByCode(params.codeTemplate);
    if (!tpl) throw new BadRequestException('Template not found');

    const subject = compileHB(tpl.subject ?? '', params.variables);
    const html = compileHB(tpl.template ?? '', params.variables);

    const info = await this.mail.send({
      to: params.to,
      subject,
      html,
      from: params.from,
    });

    return { messageId: info.messageId };
  }

  // ============================
  // SECCIÓN: NOTIFICACIONES IN-APP
  // ============================

  /**
   * Genera el título de la notificación en función del evento y variables.
   * Mantiene copy consistente para UI/Emails (si luego se reutiliza).
   */
  private buildNotificationTitle(
    event: NotificationEvent,
    vars?: Record<string, any>,
  ) {
    const entityLabel = vars?.entityLabel ?? 'Elemento';
    const name = vars?.name ?? vars?.title ?? 'Elemento';
    switch (event) {
      case 'ASSIGNED':
        const assignedText =
          entityLabel === 'Prioridad' ? 'Asignada' : 'Asignado';
        return `${entityLabel} ${assignedText}: ${name}`;
      case 'UPDATED':
        const updatedText =
          entityLabel === 'Prioridad' ? 'Actualizada' : 'Actualizado';
        return `${entityLabel} ${updatedText}: ${name}`;
      case 'DUE_SOON':
        const dueSoonText =
          entityLabel === 'Prioridad' ? 'próxima a vencer' : 'próximo a vencer';
        return `${entityLabel} ${dueSoonText}: ${name}`;
      case 'OVERDUE':
        const overdueText = entityLabel === 'Prioridad' ? 'Vencida' : 'Vencido';
        return `${entityLabel} ${overdueText}: ${name}`;
      case 'COMPLETED':
        const completedText =
          entityLabel === 'Prioridad' ? 'Completada' : 'Completado';
        return `${entityLabel} ${completedText}: ${name}`;
      case 'REOPENED':
        const reopenedText =
          entityLabel === 'Prioridad' ? 'Reabierta' : 'Reabierto';
        return `${entityLabel} ${reopenedText}: ${name}`;
      case 'APPROVAL_REQUESTED':
        return `Aprobación solicitada: ${name}`;
      case 'APPROVED':
        const approvedText =
          entityLabel === 'Prioridad' ? 'Aprobada' : 'Aprobado';
        return `${entityLabel} ${approvedText}: ${name}`;
      case 'REJECTED':
        const rejectedText =
          entityLabel === 'Prioridad' ? 'Rechazada' : 'Rechazado';
        return `${entityLabel} ${rejectedText}: ${name}`;
      default:
        return `Notificación: ${name}`;
    }
  }

  /**
   * Genera el cuerpo/mensaje corto de la notificación (UI friendly).
   * Concatena metadatos comunes (fecha de vencimiento, actor, etc.).
   */
  private buildNotificationMessage(vars?: Record<string, any>) {
    if (!vars) return 'Tienes una nueva notificación';

    const parts: string[] = [];

    if (vars.dueDate) {
      const dueDateObj =
        vars.dueDate instanceof Date ? vars.dueDate : new Date(vars.dueDate);
      const due = `${String(dueDateObj.getUTCDate()).padStart(2, '0')}/${String(
        dueDateObj.getUTCMonth() + 1,
      ).padStart(2, '0')}/${dueDateObj.getUTCFullYear()}`;
      parts.push(`Vence: ${due}`);
    }
    if (vars.actorName) {
      parts.push(`Por: ${vars.actorName}`);
    }

    if (vars.message) {
      parts.push(String(vars.message));
    }

    return parts.length > 0
      ? parts.join(' • ')
      : 'Tienes una nueva notificación';
  }

  /**
   * Payload estándar: siempre incluye entityId, name, dueDate, actorId, actorName,
   * además de cualquier otro campo que llegue en vars.
   */
  private buildPayload(
    entityId: string,
    vars?: Record<string, any>,
  ): Record<string, any> {
    const base = vars ?? {};
    return {
      entityId,
      name: base.name,
      dueDate: base.dueDate,
      actorId: base.actorId,
      actorName: base.actorName,
      ...base,
    };
  }

  /**
   * Crea una clave de deduplicación **por día** (YYYY-MM-DD), por usuario+entidad+evento+canal.
   * Evita múltiples notificaciones idénticas en la misma fecha.
   */
  private generateDailyDedupeKey(
    recipientId: string,
    entityType: NEntity,
    entityId: string,
    event: NotificationEvent,
    channel: NotificationChannel,
    at: Date,
  ) {
    const day = at.toISOString().slice(0, 10); // YYYY-MM-DD
    const raw = [recipientId, entityType, entityId, event, channel, day].join(
      '|',
    );
    return createHash('sha1').update(raw).digest('hex');
  }

  /**
   * Método central para crear una o más notificaciones para un evento.
   * Determina los canales y crea un registro por cada uno.
   */
  private async create(dto: CreateNotificationParams) {
    // TODO: La lógica de canales debería venir de la configuración del usuario/sistema.
    // Por ahora, enviamos a IN_APP y EMAIL para eventos programados.
    const channels: NotificationChannel[] =
      dto.event === 'DUE_SOON' || dto.event === 'OVERDUE'
        ? [NotificationChannel.IN_APP, NotificationChannel.EMAIL]
        : [NotificationChannel.IN_APP];

    const now = new Date();
    const payload = this.buildPayload(dto.entityId, dto.variables);
    const title = this.buildNotificationTitle(dto.event, payload);
    const message = this.buildNotificationMessage(payload);

    const notificationsToCreate: Prisma.NotificationCreateManyInput[] = [];

    for (const channel of channels) {
      let scheduledAt = dto.runAt;
      let status: NotificationStatus = NotificationStatus.PEN;

      // Las notificaciones inmediatas se marcan como SENT directamente.
      if (!scheduledAt) {
        scheduledAt = now;
        status = NotificationStatus.SENT;
      }

      // Para OVERDUE, la fecha de ejecución real es al día siguiente.
      if (dto.event === 'OVERDUE' && scheduledAt) {
        scheduledAt = this.buildOverdueNextDayRunAt(scheduledAt);
      }

      // No agendar notificaciones en el pasado.
      if (status === 'PEN' && scheduledAt <= now) {
        continue;
      }

      const dedupeKey = this.generateDailyDedupeKey(
        dto.recipientId,
        dto.entityType,
        dto.entityId,
        dto.event,
        channel,
        scheduledAt,
      );

      notificationsToCreate.push({
        companyId: dto.companyId,
        businessUnitId: dto.businessUnitId,
        recipientId: dto.recipientId,
        entityType: dto.entityType,
        entityId: dto.entityId,
        event: dto.event,
        channel,
        title,
        message,
        payload,
        status,
        scheduledAt,
        sentAt: status === 'SENT' ? now : null,
        dedupeKey,
        createdBy: dto.variables?.actorId,
      });
    }

    if (notificationsToCreate.length > 0) {
      await this.notifRepo.createMany(notificationsToCreate);
    }
  }

  // ========================
  //   IN-APP INMEDIATA
  // ========================

  /**
   * Emite una notificación inmediata (status=SENT) a los canales configurados.
   * Si ya existe una notificación igual en el día (mismo recipient+entity+event+canal+dedupeKey),
   * actualiza título/mensaje/payload en vez de crear otra.
   * Ideal para ASSIGNED/UPDATED/COMPLETED, etc.
   */
  async emit(dto: Omit<CreateNotificationParams, 'runAt'>) {
    // La lógica de idempotencia de `emitImmediateInApp` era compleja y solo para IN_APP.
    // Simplificamos: `createMany` con `skipDuplicates` ya previene duplicados exactos.
    // Si se necesita actualizar contenido, se puede implementar una lógica similar a `updateContentByUnique`
    // pero que itere sobre los canales. Por ahora, nos enfocamos en la creación limpia.
    await this.create(dto);
  }

  /**
   * @deprecated Usar `emit` en su lugar.
   */
  async emitImmediateInApp(dto: Omit<CreateNotificationParams, 'runAt'>) {
    // Simplemente delegamos al nuevo método `emit` para mantener la compatibilidad
    // mientras se refactorizan todas las llamadas.
    await this.emit(dto);
  }

  // ========================
  //   IN-APP PROGRAMADA
  // ========================

  /**
   * Programa una notificación para una fecha futura en los canales configurados.
   * - Crea con `status=PEN` y `scheduledAt=runAt`.
   * - El Scheduler (cron) la marcará `SENT` cuando llegue la hora.
   * - Usada para DUE_SOON (-4/-1) y OVERDUE.
   */
  async schedule(dto: CreateNotificationParams & { runAt: Date }) {
    await this.create(dto);
  }

  /**
   * @deprecated Usar `schedule` en su lugar.
   */
  async scheduleInApp(dto: CreateNotificationParams & { runAt: Date }) {
    await this.schedule(dto);
  }

  /**
   * Reprograma notificaciones relativas a fecha (DUE_SOON/OVERDUE) cuando cambia la fecha de vencimiento `untilAt`:
   * - Expira programadas vigentes.
   * - Expira DUE_SOON/OVERDUE previas y vuelve a crear nuevas para la nueva fecha.
   */
  async rescheduleOnDateChange(args: RescheduleArgs) {
    await this.notifRepo.expireScheduledBy(args.entityType, args.entityId, [
      'DUE_SOON',
      'OVERDUE',
    ] as any);

    const minus = (d: Date, n: number) =>
      new Date(d.getTime() - n * 86_400_000);

    await this.schedule({
      ...args,
      event: 'DUE_SOON',
      runAt: minus(args.newDate, 4),
    } as any);

    await this.schedule({
      ...args,
      event: 'DUE_SOON',
      runAt: minus(args.newDate, 1),
    } as any);

    await this.schedule({
      ...args,
      event: 'OVERDUE',
      runAt: args.newDate,
    } as any);
  }

  /**
   * Refresca el contenido (title/message/payload) de todas las notificaciones
   * programadas (PEN) activas para una entidad. Útil cuando cambia solo el nombre.
   */
  async refreshScheduledContentForEntity(args: {
    entityType: NEntity;
    entityId: string;
    event: NotificationEvent;
    variables: Record<string, any>;
  }) {
    const payload = this.buildPayload(args.entityId, args.variables);
    const title = this.buildNotificationTitle(args.event, payload);
    const message = this.buildNotificationMessage(payload);

    await this.notifRepo.refreshScheduledMetadataForEntity({
      entityType: args.entityType,
      entityId: args.entityId,
      event: args.event,
      title,
      message,
      payload: payload as Prisma.InputJsonValue,
    });
  }

  /**
   * Expira notificaciones programadas (DUE_SOON/OVERDUE) cuando la entidad se cierra/cancela.
   */
  async expireForClosed(args: { entityType: NEntity; entityId: string }) {
    await this.notifRepo.expireScheduledBy(args.entityType, args.entityId, [
      'DUE_SOON',
      'OVERDUE',
    ] as any);
  }

  /**
   * Elimina notificaciones programadas (PEN) para una entidad, filtrando
   * por un subconjunto de datos en el `payload`.
   * Se usa para eliminar físicamente las notificaciones de metas de objetivos
   * cuando se reduce el rango de meses.
   */
  async deleteForClosedByPayload(args: {
    entityType: NEntity;
    entityId: string;
    payloadMatch: Record<string, any>;
  }) {
    await this.notifRepo.deleteScheduledByPayload({
      entityType: args.entityType,
      entityId: args.entityId,
      payloadMatch: args.payloadMatch as Prisma.InputJsonValue,
      // Por defecto, eliminamos las mismas que se programan
      events: ['DUE_SOON', 'OVERDUE'],
    });
  }

  /**
   * Devuelve la bandeja del usuario autenticado:
   * - Paginación, filtros por `status`, `event` y búsqueda por texto.
   * - Formatea salida con `NotificationEntity.toResponse()`.
   */
  async listInbox(userId: string, q: InboxQuery) {
    const [items, total] = await this.notifRepo.listInbox(userId, q);
    return {
      items: items.map((n) => new ResponseEntity(n).toResponse()),
      total,
      page: q.page,
      pageSize: q.pageSize,
    };
  }

  /**
   * Marca como **leída** una notificación del usuario.
   * - Valida ownership en el repositorio.
   */
  async markRead(id: string, userId: string) {
    const n = await this.notifRepo.markRead(id, userId);
    return n ? new ResponseEntity(n).toResponse() : null;
  }

  /**
   * Calcula la fecha/hora real para disparar la notificación OVERDUE:
   * - Día siguiente al vencimiento a las 00:00.
   */
  private buildOverdueNextDayRunAt(dueDate: Date): Date {
    const y = dueDate.getUTCFullYear();
    const m = dueDate.getUTCMonth();
    const d = dueDate.getUTCDate();

    // Día siguiente a las 00:00 (podrías cambiar a 8:00 si luego quieres horario laboral)
    return new Date(Date.UTC(y, m, d + 1, 0, 0, 0, 0));
  }

  /**
   * Construye el texto de estado para la plantilla de correo.
   */
  private getStatusTextForEvent(event: NotificationEvent): string {
    switch (event) {
      case 'DUE_SOON':
        return 'está próximo a vencer';
      case 'OVERDUE':
        return 'ha vencido';
      default:
        return '';
    }
  }

  /**
   * Formatea una fecha a DD/MM/YYYY.
   */
  private formatDate(date: string | Date | undefined): string {
    if (!date) return 'N/A';
    const d = date instanceof Date ? date : new Date(date);
    return `${String(d.getUTCDate()).padStart(2, '0')}/${String(
      d.getUTCMonth() + 1,
    ).padStart(2, '0')}/${d.getUTCFullYear()}`;
  }
}

/** Compilación segura de Handlebars (sin escape automático de comillas HTML). */
function compileHB(source: string, vars: Record<string, any> = {}) {
  const compiled = Handlebars.compile(source, { noEscape: true });
  return compiled(vars);
}
