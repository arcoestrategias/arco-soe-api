import { Injectable, NotFoundException } from '@nestjs/common';
import { IndicatorRepository } from './repositories/indicator.repository';
import { CreateIndicatorDto, UpdateIndicatorDto } from './dto';
import { IndicatorEntity } from './entities/indicator.entity';

@Injectable()
export class IndicatorService {
  constructor(private readonly repository: IndicatorRepository) {}

  async create(
    dto: CreateIndicatorDto,
    userId: string,
  ): Promise<IndicatorEntity> {
    return this.repository.create(dto, userId);
  }

  async findById(id: string): Promise<IndicatorEntity> {
    const indicator = await this.repository.findById(id);
    if (!indicator) {
      throw new NotFoundException('Indicador no encontrado');
    }
    return indicator;
  }

  async update(
    id: string,
    dto: UpdateIndicatorDto,
    userId: string,
  ): Promise<IndicatorEntity> {
    return this.repository.update(id, dto, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.repository.remove(id, userId);
  }
}
