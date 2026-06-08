import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersModule } from 'src/users/users.module';
import { MeetingsController } from './meetings.controller';
import { MeetingsService } from './services/meetings.service';
import { MeetingMinutesService } from './services/meeting-minutes.service';
import { PriorityModule } from 'src/priority/priority.module';
import { FilesModule } from 'src/files/files.module';
import { MeetingsRepository } from './repositories/meetings.repository';
import { PermissionValidatorService } from 'src/core/services/permission-validator.service';

@Module({
  imports: [UsersModule, PriorityModule, FilesModule],
  controllers: [MeetingsController],
  providers: [
    PrismaService,
    MeetingsService,
    MeetingMinutesService,
    MeetingsRepository,
    PermissionValidatorService,
  ],
})
export class MeetingsModule {}
