import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MailModule } from 'src/mail/mail.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationService } from './notifications.service';
import { NotificationTemplateRepository } from './repositories/notification-template.repository';
import { NotificationRepository } from './repositories/notification.repository';
import { NotificationController } from './notifications.controller';
import { NotificationScheduler } from './notification.scheduler';

@Module({
  imports: [MailModule, ScheduleModule.forRoot()],
  providers: [
    PrismaService,
    NotificationService,
    NotificationTemplateRepository,
    NotificationRepository,  
    NotificationScheduler,      
  ],
  controllers: [NotificationController],
  exports: [NotificationService],
})
export class NotificationsModule {}
