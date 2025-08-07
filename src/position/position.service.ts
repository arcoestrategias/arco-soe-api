import { Injectable, NotFoundException } from '@nestjs/common';
import { PositionsRepository } from './repositories/positions.repository';
import { CreatePositionDto, UpdatePositionDto } from './dto';
import { PositionEntity } from './entities/position.entity';

@Injectable()
export class PositionsService {
  constructor(private readonly positionsRepo: PositionsRepository) {}

  async create(
    dto: CreatePositionDto,
    userId: string,
  ): Promise<PositionEntity> {
    return this.positionsRepo.create(dto, userId);
  }

  async findAll(): Promise<PositionEntity[]> {
    return this.positionsRepo.findAll();
  }

  async findById(id: string): Promise<PositionEntity> {
    const position = await this.positionsRepo.findById(id);
    if (!position) throw new NotFoundException('Posición no encontrada');
    return position;
  }

  async update(
    id: string,
    dto: UpdatePositionDto,
    userId: string,
  ): Promise<PositionEntity> {
    const exists = await this.positionsRepo.findById(id);
    if (!exists) throw new NotFoundException('Posición no encontrada');
    return this.positionsRepo.update(id, dto, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    const exists = await this.positionsRepo.findById(id);
    if (!exists) throw new NotFoundException('Posición no encontrada');
    await this.positionsRepo.remove(id, userId);
  }
}
