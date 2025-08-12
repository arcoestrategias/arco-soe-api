import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { handleDatabaseErrors } from 'src/common/helpers/database-error.helper';
import { CreateIndicatorDto, UpdateIndicatorDto } from '../dto';
import { IndicatorEntity } from '../entities/indicator.entity';

@Injectable()
export class IndicatorRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateIndicatorDto,
    userId: string,
  ): Promise<IndicatorEntity> {
    try {
      const created = await this.prisma.indicator.create({
        data: {
          ...data,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      return new IndicatorEntity(created);
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async findById(id: string): Promise<IndicatorEntity | null> {
    const found = await this.prisma.indicator.findUnique({
      where: { id },
    });
    return found ? new IndicatorEntity(found) : null;
  }

  async update(
    id: string,
    data: UpdateIndicatorDto,
    userId: string,
  ): Promise<IndicatorEntity> {
    try {
      const updated = await this.prisma.indicator.update({
        where: { id },
        data: {
          ...data,
          updatedBy: userId,
        },
      });

      return new IndicatorEntity(updated);
    } catch (error) {
      console.log(error);
      handleDatabaseErrors(error);
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    try {
      await this.prisma.indicator.update({
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
}
