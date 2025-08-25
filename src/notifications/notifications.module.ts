import { Module } from '@nestjs/common';
import { MailModule } from 'src/mail/mail.module';
import { NotificationService } from './notifications.service';
import { NotificationTemplateRepository } from './repositories/notification-template.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationController } from './notifications.controller';

@Module({
  imports: [MailModule],
  providers: [
    NotificationService,
    NotificationTemplateRepository,
    PrismaService,
  ],
  controllers: [NotificationController],
  exports: [NotificationService],
})
export class NotificationsModule {}
