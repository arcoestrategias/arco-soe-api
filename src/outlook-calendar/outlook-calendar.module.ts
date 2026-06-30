import { Module } from '@nestjs/common';
import { OutlookCalendarService } from './outlook-calendar.service';
import { OutlookCalendarController } from './outlook-calendar.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  providers: [OutlookCalendarService, PrismaService],
  controllers: [OutlookCalendarController],
  exports: [OutlookCalendarService],
})
export class OutlookCalendarModule {}
