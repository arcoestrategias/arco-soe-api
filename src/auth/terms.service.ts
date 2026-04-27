import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TERMS_AND_CONDITIONS } from './constants/terms.constant';

@Injectable()
export class TermsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentTerms() {
    const dbTerms = await this.prisma.termsAndConditions.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (dbTerms) {
      return {
        id: dbTerms.id,
        version: dbTerms.version,
        content: dbTerms.content,
      };
    }

    return {
      id: null,
      version: TERMS_AND_CONDITIONS.version,
      content: TERMS_AND_CONDITIONS.content,
    };
  }

  async hasAcceptedCurrentTerms(userId: string): Promise<boolean> {
    const currentTerms = await this.getCurrentTerms();
    if (!currentTerms.id) return true;

    const acceptance = await this.prisma.termsAcceptance.findUnique({
      where: {
        userId_termsId: {
          userId,
          termsId: currentTerms.id,
        },
      },
    });

    return !!acceptance;
  }

  async acceptTerms(userId: string, ipAddress?: string) {
    const currentTerms = await this.getCurrentTerms();

    if (!currentTerms.id) {
      throw new NotFoundException('No existen términos activos para aceptar');
    }

    const existing = await this.prisma.termsAcceptance.findUnique({
      where: {
        userId_termsId: {
          userId,
          termsId: currentTerms.id,
        },
      },
    });

    if (existing) {
      return { alreadyAccepted: true, acceptedAt: existing.acceptedAt };
    }

    const acceptance = await this.prisma.termsAcceptance.create({
      data: {
        userId,
        termsId: currentTerms.id,
        termsVersion: currentTerms.version,
        ipAddress,
      },
    });

    return {
      alreadyAccepted: false,
      acceptedAt: acceptance.acceptedAt,
    };
  }

  async getAcceptanceHistory(userId: string) {
    return this.prisma.termsAcceptance.findMany({
      where: { userId },
      include: { terms: true },
      orderBy: { acceptedAt: 'desc' },
    });
  }
}
