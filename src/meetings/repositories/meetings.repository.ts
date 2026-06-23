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
        _count: { select: { minutes: true, children: true } },
      },
    });
  }

  async findSiblings(parentId: string) {
    return this.prisma.meeting.findMany({
      where: { parentId, status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        status: true,
        _count: { select: { minutes: true } },
      },
    });
  }

  async findParentAndSiblings(parentId: string) {
    const [parent, siblings] = await Promise.all([
      this.findById(parentId),
      this.findSiblings(parentId),
    ]);
    return { parent, siblings };
  }

  async findUserMeetings(
    userId: string,
    companyId: string,
  ): Promise<Meeting[]> {
    return this.prisma.meeting.findMany({
      where: {
        companyId,
        status: 'ACTIVE',
        participants: {
          some: { userId },
        },
      },
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
        _count: { select: { minutes: true, children: true } },
      },
    });
  }

  async findUserMeetingsWithMinutes(
    userId: string,
    companyId: string,
  ) {
    return this.prisma.meeting.findMany({
      where: {
        companyId,
        status: 'ACTIVE',
        participants: {
          some: { userId },
        },
      },
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
        minutes: {
          orderBy: { version: 'desc' },
          take: 1,
          select: { id: true, version: true, status: true, createdAt: true },
        },
        _count: { select: { minutes: true, children: true } },
      },
    });
  }

  async findAllByCompanyWithMinutes(companyId: string) {
    return this.prisma.meeting.findMany({
      where: { companyId, status: 'ACTIVE' },
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
        minutes: {
          orderBy: { version: 'desc' },
          take: 1,
          select: { id: true, version: true, status: true, createdAt: true },
        },
        _count: { select: { minutes: true, children: true } },
      },
    });
  }

  async update(id: string, data: Prisma.MeetingUpdateInput): Promise<Meeting> {
    return this.prisma.meeting.update({ where: { id }, data });
  }
}
