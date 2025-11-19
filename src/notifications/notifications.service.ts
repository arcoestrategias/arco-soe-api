import { BadRequestException, Injectable } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import { MailService } from 'src/mail/mail.service';
import { NotificationTemplateRepository } from './repositories/notification-template.repository';
import { NotificationRepository } from './repositories/notification.repository';
import {
  NotificationChannel,
  NotificationEntity as NEntity,
  NotificationEvent,
  NotificationStatus,
  Prisma,
} from '@prisma/client';
import { NotificationEntity as ResponseEntity } from './entities/notification.entity';
import { createHash } from 'crypto';

/** Milisegundos de un día (para restar días a fechas con claridad). */
const DAY_MS = 86_400_000;

/** Parámetros para emisión IN-APP inmediata. */
type InAppImmediateParams = {
  companyId: string;
  businessUnitId: string;
  recipientId: string;
  entityType: NEntity;
  entityId: string;
  event: NotificationEvent;
  variables?: Record<string, any>;
};

/** Parámetros para programación IN-APP (DUE_SOON/OVERDUE). */
type InAppScheduleParams = {
  companyId: string;
  businessUnitId: string;
  recipientId: string;
  entityType: NEntity;
  entityId: string;
  event: Extract<NotificationEvent, 'DUE_SOON' | 'OVERDUE'>;
  runAt: Date;
  variables?: Record<string, any>;
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
  constructor(
    private readonly mail: MailService,
    private readonly templates: NotificationTemplateRepository,
    private readonly notifRepo: NotificationRepository,
  ) {}

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
    const name = vars?.name ?? vars?.title ?? 'Elemento';
    switch (event) {
      case 'ASSIGNED':
        return `Asignado: ${name}`;
      case 'UPDATED':
        return `Actualizado: ${name}`;
      case 'DUE_SOON':
        return `Próximo a vencer: ${name}`;
      case 'OVERDUE':
        return `Vencido: ${name}`;
      case 'COMPLETED':
        return `Completado: ${name}`;
      case 'REOPENED':
        return `Reabierto: ${name}`;
      case 'APPROVAL_REQUESTED':
        return `Aprobación solicitada: ${name}`;
      case 'APPROVED':
        return `Aprobado: ${name}`;
      case 'REJECTED':
        return `Rechazado: ${name}`;
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

    if (vars.message) {
      parts.push(String(vars.message));
    }

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

  // ========================
  //   IN-APP INMEDIATA
  // ========================

  /**
   * Notificación IN-APP inmediata (status=SENT).
   * Si ya existe una notificación igual en el día (mismo recipient+entity+event+canal+dedupeKey),
   * actualiza título/mensaje/payload en vez de crear otra.
   * Ideal para ASSIGNED/UPDATED/COMPLETED, etc.
   */
  async emitImmediateInApp(dto: InAppImmediateParams) {
    const now = new Date();
    const channel = NotificationChannel.IN_APP;

    const payload = this.buildPayload(dto.entityId, dto.variables);
    const title = this.buildNotificationTitle(dto.event, payload);
    console.log(payload);
    const message = this.buildNotificationMessage(payload);
    const dedupeKey = this.generateDailyDedupeKey(
      dto.recipientId,
      dto.entityType,
      dto.entityId,
      dto.event,
      channel,
      now,
    );

    // 1) Intentar actualizar si ya existe (idempotencia por día)
    const updatedCount = await this.notifRepo.updateContentByUnique({
      recipientId: dto.recipientId,
      entityType: dto.entityType,
      entityId: dto.entityId,
      event: dto.event,
      channel,
      dedupeKey,
      title,
      message,
      payload: payload as Prisma.InputJsonValue,
    });

    if (updatedCount > 0) {
      // Ya había una notificación para hoy → se actualizó contenido.
      return;
    }

    // 2) Si no existía, crear una nueva
    await this.notifRepo.createMany([
      {
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
        status: NotificationStatus.SENT,
        scheduledAt: now,
        sentAt: now,
        dedupeKey,
        createdBy: null,
      },
    ]);
  }

  // ========================
  //   IN-APP PROGRAMADA
  // ========================

  /**
   * Programa una notificación **IN-APP** para una fecha futura:
   * - Crea con `status=PEN` y `scheduledAt=runAt`.
   * - El Scheduler (cron) la marcará `SENT` cuando llegue la hora.
   * - Usada para DUE_SOON (-4/-1) y OVERDUE.
   * - Si ya existe una programada con el mismo dedupeKey, no duplica (Idempotencia por `dedupeKey`)
   */
  async scheduleInApp(dto: InAppScheduleParams) {
    const channel = NotificationChannel.IN_APP;

    // 0) Normalizar la fecha de disparo según el tipo de evento
    let scheduledAt = dto.runAt;

    // Para OVERDUE, interpretamos dto.runAt como "fecha de vencimiento"
    // y programamos la notificación para el día siguiente.
    if (dto.event === 'OVERDUE') {
      scheduledAt = this.buildOverdueNextDayRunAt(dto.runAt);
    }

    // 1) No agendar notificaciones en el pasado
    const now = new Date();
    if (scheduledAt <= now) {
      // Silencioso: simplemente no creamos nada
      return;
    }

    // 2) Armar payload, título y mensaje coherentes
    const payload = this.buildPayload(dto.entityId, dto.variables);
    const title = this.buildNotificationTitle(dto.event, payload);
    const message = this.buildNotificationMessage(payload);

    if (dto.event === 'OVERDUE') {
      console.log(
        '[DEBUG][OVERDUE] dto.runAt=',
        dto.runAt,
        'scheduledAt=',
        scheduledAt,
        'now=',
        now,
      );
    }

    // 3) Dedupe por día (para no duplicar el mismo evento/canal en la misma fecha)
    const dedupeKey = this.generateDailyDedupeKey(
      dto.recipientId,
      dto.entityType,
      dto.entityId,
      dto.event,
      channel,
      scheduledAt,
    );

    const exists = await this.notifRepo.existsByUnique({
      recipientId: dto.recipientId,
      entityType: dto.entityType,
      entityId: dto.entityId,
      event: dto.event,
      channel,
      dedupeKey,
    });
    if (exists) return;

    // 4) Crear notificación programada
    await this.notifRepo.createMany([
      {
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
        status: NotificationStatus.PEN,
        scheduledAt,
        sentAt: null,
        dedupeKey,
        createdBy: null,
      },
    ]);
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

    await this.scheduleInApp({
      ...args,
      event: 'DUE_SOON',
      runAt: minus(args.newDate, 4),
    } as any);

    await this.scheduleInApp({
      ...args,
      event: 'DUE_SOON',
      runAt: minus(args.newDate, 1),
    } as any);

    await this.scheduleInApp({
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
}

/** Compilación segura de Handlebars (sin escape automático de comillas HTML). */
function compileHB(source: string, vars: Record<string, any> = {}) {
  const compiled = Handlebars.compile(source, { noEscape: true });
  return compiled(vars);
}
