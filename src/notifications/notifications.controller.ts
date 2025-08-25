import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { NotificationService } from './notifications.service';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notif: NotificationService) {}

  @Post('send')
  send(
    @Body()
    body: {
      codeTemplate: string;
      to: string | string[];
      variables?: Record<string, any>;
    },
  ) {
    return this.notif.sendByCode(body);
  }
}
