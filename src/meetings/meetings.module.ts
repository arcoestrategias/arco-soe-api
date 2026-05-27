import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersModule } from 'src/users/users.module';
import { PriorityModule } from 'src/priority/priority.module';
import { FilesModule } from 'src/files/files.module';
import { MeetingsController } from './meetings.controller';
import { MeetingsService } from './services/meetings.service';
import { MeetingMinutesService } from './services/meeting-minutes.service';
import { RecurrenceService } from './services/recurrence.service';
import { MeetingOccurrenceService } from './services/meeting-occurrence.service';
import { MeetingsRepository } from './repositories/meetings.repository';
import { MeetingOccurrencesRepository } from './repositories/meeting-occurrences.repository';
import { MeetingParticipantsRepository } from './repositories/meeting-participants.repository';

@Module({
  imports: [UsersModule, PriorityModule, FilesModule],
  controllers: [MeetingsController],
  providers: [
    PrismaService,
    MeetingsService,
    MeetingMinutesService,
    RecurrenceService,
    MeetingOccurrenceService,
    MeetingsRepository,
    MeetingOccurrencesRepository,
    MeetingParticipantsRepository,
  ],
})
export class MeetingsModule {}
