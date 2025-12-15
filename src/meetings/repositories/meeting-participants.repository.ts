import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class MeetingParticipantsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(
    data: Prisma.MeetingParticipantCreateManyInput[],
  ): Promise<Prisma.BatchPayload> {
    return this.prisma.meetingParticipant.createMany({ data });
  }
}
