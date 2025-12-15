import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersModule } from 'src/users/users.module';
import { MeetingsController } from './meetings.controller';
import { MeetingsService } from './services/meetings.service';
import { RecurrenceService } from './services/recurrence.service';
import { MeetingOccurrenceService } from './services/meeting-occurrence.service';
import { MeetingsRepository } from './repositories/meetings.repository';
import { MeetingOccurrencesRepository } from './repositories/meeting-occurrences.repository';
import { MeetingParticipantsRepository } from './repositories/meeting-participants.repository';

@Module({
  imports: [UsersModule],
  controllers: [MeetingsController],
  providers: [
    PrismaService,
    MeetingsService,
    RecurrenceService,
    MeetingOccurrenceService,
    MeetingsRepository,
    MeetingOccurrencesRepository,
    MeetingParticipantsRepository,
  ],
})
export class MeetingsModule {}
