import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { handleDatabaseErrors } from 'src/common/helpers/database-error.helper';

import { BusinessUnitEntity } from '../entities/business-unit.entity';
import { CreateBusinessUnitDto, UpdateBusinessUnitDto } from '../dto';

@Injectable()
export class BusinessUnitsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateBusinessUnitDto,
    userId: string,
  ): Promise<BusinessUnitEntity> {
    try {
      const unit = await this.prisma.businessUnit.create({
        data: {
          ...data,
          createdBy: userId,
          updatedBy: userId,
        },
      });
      return new BusinessUnitEntity(unit);
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async findAll(): Promise<BusinessUnitEntity[]> {
    const units = await this.prisma.businessUnit.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });
    return units.map((u) => new BusinessUnitEntity(u));
  }

  async findById(id: string): Promise<BusinessUnitEntity | null> {
    const unit = await this.prisma.businessUnit.findUnique({
      where: { id },
    });
    return unit ? new BusinessUnitEntity(unit) : null;
  }

  async findByCompanyId(companyId: string): Promise<BusinessUnitEntity[]> {
    const units = await this.prisma.businessUnit.findMany({
      where: {
        companyId,
        isActive: true,
      },
      orderBy: { order: 'asc' },
    });
    return units.map((u) => new BusinessUnitEntity(u));
  }

  async update(
    id: string,
    data: UpdateBusinessUnitDto,
    userId: string,
  ): Promise<BusinessUnitEntity> {
    try {
      const unit = await this.prisma.businessUnit.update({
        where: { id },
        data: {
          ...data,
          updatedBy: userId,
        },
      });
      return new BusinessUnitEntity(unit);
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    try {
      await this.prisma.businessUnit.update({
        where: { id },
        data: {
          isActive: false,
          updatedBy: userId,
        },
      });
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async findUserPermissionsGroupedByModule(
    userId: string,
    businessUnitId: string,
  ) {
    return this.prisma.userPermission.findMany({
      where: {
        userId,
        businessUnitId,
        isAllowed: true,
      },
      include: {
        permission: {
          include: {
            module: true,
          },
        },
      },
      orderBy: {
        permission: {
          module: {
            name: 'asc',
          },
        },
      },
    });
  }
}
