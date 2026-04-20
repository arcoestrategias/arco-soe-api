import {
  createParamDecorator,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const CompanyId = createParamDecorator(
  async (_data: unknown, ctx: ExecutionContext): Promise<string> => {
    const request = ctx.switchToHttp().getRequest();

    const companyIdHeader = request.headers['x-company-id'];
    if (companyIdHeader) {
      return companyIdHeader;
    }

    const businessUnitId = request.headers['x-business-unit-id'];
    if (businessUnitId) {
      const businessUnit = await prisma.businessUnit.findUnique({
        where: { id: businessUnitId },
        select: { companyId: true },
      });

      if (!businessUnit) {
        throw new BadRequestException('BusinessUnit not found');
      }

      return businessUnit.companyId;
    }

    throw new BadRequestException('CompanyId or BusinessUnitId is required');
  },
);
