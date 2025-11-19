import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationRepository } from './repositories/notification.repository';

/**
 * Orquestador de notificaciones programadas (IN-APP) usando cron.
 * - No toca Prisma directamente (delegado al Repository).
 * - No envía email ni WS; solo cambia estado a SENT cuando corresponde.
 * - Punto de extensión futuro: emitir por WebSocket cuando se marque como SENT.
 */
@Injectable()
export class NotificationScheduler {
  private readonly logger = new Logger(NotificationScheduler.name);

  constructor(private readonly repo: NotificationRepository) {}

  /**
   * Corre cada 10 segundos.
   * 1) Obtiene notificaciones IN-APP pendientes (`PEN`) con `scheduledAt <= now`.
   * 2) Las marca como `SENT` (y setea `sentAt`).
   * Notas:
   * - Idempotencia: si una notificación ya está SENT/READ/EXP, no califica en el query.
   * - Si luego agregas WebSocket, aquí puedes emitir el evento al usuario.
   */
  @Cron(CronExpression.EVERY_10_SECONDS)
  async processPendingInApp(): Promise<void> {
    try {
      const pending = await this.repo.findPendingInApp(200);
      if (!pending.length) return;

      this.logger.debug(
        `Procesando ${pending.length} notificaciones IN-APP pendientes`,
      );

      for (const n of pending) {
        try {
          await this.repo.markSent(n.id);
          // Punto de extensión futuro (WS): this.gateway.emitToUser(n.recipientId, 'notification:new', n)
        } catch (err) {
          this.logger.error(
            `Fallo al marcar SENT notificación ${n.id}`,
            err as any,
          );
        }
      }
    } catch (err) {
      this.logger.error('Fallo procesando IN-APP pendientes', err as any);
    }
  }

  /**
   * (Opcional, desactivado)
   * Ejemplo de reconciliación nocturna:
   * - Revisa entidades vencidas y crea OVERDUE faltantes de manera idempotente.
   * - Útil si por alguna razón no se programó a tiempo (migraciones o imports).
   *
   * @Cron('7 0 * * *')
   * async reconcileOverdue() {
   *   // 1) Encontrar entidades vencidas hoy y usuarios responsables
   *   // 2) Para cada una, construir dedupeKey y crear si no existe
   * }
   */
}
