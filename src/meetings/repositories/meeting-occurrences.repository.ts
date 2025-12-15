import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { MeetingOccurrence, Prisma } from '@prisma/client';

@Injectable()
export class MeetingOccurrencesRepository {
  constructor(public readonly prisma: PrismaService) {}

  async createMany(
    data: Prisma.MeetingOccurrenceCreateManyInput[],
  ): Promise<Prisma.BatchPayload> {
    return this.prisma.meetingOccurrence.createMany({ data });
  }

  async findForCalendar(
    from: Date,
    to: Date,
    userId?: string,
    companyId?: string,
    businessUnitId?: string,
  ): Promise<any[]> {
    const whereClause: Prisma.MeetingOccurrenceWhereInput = {
      startDate: { gte: from },
      endDate: { lte: to },
      isCancelled: false,
    };

    const meetingWhere: Prisma.MeetingWhereInput = {};

    if (companyId) {
      meetingWhere.companyId = companyId;
    }

    if (businessUnitId) {
      meetingWhere.businessUnitId = businessUnitId;
    }

    if (userId) {
      meetingWhere.participants = {
        some: { userId },
      };
    }

    if (Object.keys(meetingWhere).length > 0) {
      whereClause.meeting = meetingWhere;
    }

    return this.prisma.meetingOccurrence.findMany({
      where: whereClause,
      select: {
        id: true,
        startDate: true,
        endDate: true,
        isExecuted: true,
        isCancelled: true,
        meeting: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    });
  }

  async deleteFutureOccurrences(meetingId: string, fromDate: Date) {
    return this.prisma.meetingOccurrence.deleteMany({
      where: {
        meetingId,
        startDate: {
          gte: fromDate,
        },
      },
    });
  }
}
