import {
  Body,
  Controller,
  Get,
  Patch,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { NotificationService } from './notifications.service';
import {
  ListNotificationsDto,
  ReadNotificationDto,
  EmitImmediateDto,
  ScheduleDto,
} from './dto';
import { SuccessMessage } from 'src/core/decorators/success-message.decorator';
import { PermissionsGuard } from 'src/core/guards/permissions.guard';
import { Permissions } from 'src/core/decorators/permissions.decorator';
import { UserId } from 'src/common/decorators/user-id.decorator';
import { PERMISSIONS } from 'src/common/constants/permissions.constant';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notifications: NotificationService) {}

  /**
   * POST /notifications/send
   * Envío de EMAIL por código de plantilla (flujo existente).
   * No se modifica la firma ni el comportamiento; se delega a NotificationService.sendByCode.
   */
  @Post('send')
  @SuccessMessage('Correo enviado')
  async sendByTemplate(
    @Body()
    body: {
      codeTemplate: string;
      to: string | string[];
      variables?: Record<string, any>;
      from?: string;
    },
  ) {
    return this.notifications.sendByCode(body);
  }

  /**
   * GET /notifications
   * Bandeja IN-APP del usuario autenticado (paginada, filtrable).
   * Requiere permiso: notifications.read
   */
  @UseGuards(PermissionsGuard)
  @Get()
  // @Permissions(PERMISSIONS.NOTIFICATIONS.READ)
  @SuccessMessage('Listado de notificaciones')
  async listMyInbox(
    @UserId() userId: string,
    @Query() q: ListNotificationsDto,
  ) {
    return this.notifications.listInbox(userId, {
      status: q.status,
      event: q.event,
      page: q.page,
      pageSize: q.pageSize,
      search: q.search,
    });
  }

  /**
   * PATCH /notifications/:id/read
   * Marca como LEÍDA una notificación del propio usuario.
   * Requiere permiso: notifications.update
   */
  @UseGuards(PermissionsGuard)
  @Patch(':id/read')
  // @Permissions(PERMISSIONS.NOTIFICATIONS.UPDATE)
  @SuccessMessage('Notificación marcada como leída')
  async markAsRead(
    @UserId() userId: string,
    @Param() params: ReadNotificationDto,
  ) {
    return this.notifications.markRead(params.id, userId);
  }

  /**
   * POST /notifications/emit
   * Emite una notificación IN-APP inmediata (status=SENT).
   * Requiere permiso: notifications.create
   * Útil para ASSIGNED/UPDATED/COMPLETED, etc.
   */
  @UseGuards(PermissionsGuard)
  @Post('emit')
  @Permissions(PERMISSIONS.NOTIFICATIONS.CREATE)
  @SuccessMessage('Notificación emitida')
  async emitImmediate(@Body() dto: EmitImmediateDto) {
    return this.notifications.emitImmediateInApp(dto);
  }

  /**
   * POST /notifications/schedule
   * Programa una notificación IN-APP (status=PEN) para ejecutarse en `runAt`.
   * Requiere permiso: notifications.create
   * Casos típicos: DUE_SOON (-4d/-1d) y OVERDUE (fecha límite).
   */
  @UseGuards(PermissionsGuard)
  @Post('schedule')
  @Permissions(PERMISSIONS.NOTIFICATIONS.CREATE)
  @SuccessMessage('Notificación programada')
  async schedule(@Body() dto: ScheduleDto) {
    return this.notifications.scheduleInApp(dto);
  }
}
