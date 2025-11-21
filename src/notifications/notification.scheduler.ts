import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationService } from './notifications.service';

/**
 * Orquestador de notificaciones programadas (IN-APP) usando cron.
 * - Su única responsabilidad es disparar el job a una hora determinada.
 * - Delega toda la lógica de negocio al NotificationService.
 */
@Injectable()
export class NotificationScheduler {
  private readonly logger = new Logger(NotificationScheduler.name);

  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Corre cada minuto para buscar y enviar notificaciones programadas
   * (DUE_SOON, OVERDUE) que ya debieron ser enviadas.
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async handleCron() {
    this.logger.log(
      'Ejecutando job de notificaciones programadas (IN-APP y EMAIL)...',
    );

    // --- Procesar notificaciones IN-APP ---
    try {
      const inAppCount =
        await this.notificationService.processPendingScheduledNotifications();
      if (inAppCount > 0) {
        this.logger.log(
          `Se procesaron exitosamente ${inAppCount} notificaciones IN-APP.`,
        );
      }
    } catch (error) {
      this.logger.error('Fallo al procesar notificaciones IN-APP', error.stack);
    }

    // --- Procesar notificaciones por EMAIL ---
    try {
      const emailCount =
        await this.notificationService.processPendingEmailNotifications();
      if (emailCount > 0) {
        this.logger.log(
          `Se procesaron exitosamente ${emailCount} notificaciones por EMAIL.`,
        );
      }
    } catch (error) {
      this.logger.error(
        'Fallo al procesar notificaciones por EMAIL',
        error.stack,
      );
    }
  }
}
