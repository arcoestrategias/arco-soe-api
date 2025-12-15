import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Meeting, Prisma } from '@prisma/client';

@Injectable()
export class MeetingsRepository {
  constructor(public readonly prisma: PrismaService) {}

  async create(data: Prisma.MeetingCreateInput): Promise<Meeting> {
    return this.prisma.meeting.create({ data });
  }

  async findById(id: string): Promise<Meeting | null> {
    return this.prisma.meeting.findUnique({
      where: { id },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                username: true,
              },
            },
          },
        },
      },
    });
  }

  async findUserMeetings(
    userId: string,
    companyId: string,
  ): Promise<Meeting[]> {
    return this.prisma.meeting.findMany({
      where: {
        companyId,
        participants: {
          some: {
            userId,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async update(id: string, data: Prisma.MeetingUpdateInput): Promise<Meeting> {
    return this.prisma.meeting.update({ where: { id }, data });
  }
}
