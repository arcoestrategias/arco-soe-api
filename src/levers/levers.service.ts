import { Injectable, NotFoundException } from '@nestjs/common';
import { LeversRepository } from './repositories/levers.repository';
import { CreateLeverDto, ReorderLeverWrapperDto, UpdateLeverDto } from './dto';
import { LeverEntity } from './entities/lever.entity';

@Injectable()
export class LeversService {
  constructor(private readonly repo: LeversRepository) {}

  async create(dto: CreateLeverDto, userId: string): Promise<LeverEntity> {
    return this.repo.create(dto, userId);
  }

  async findAll(positionId: string): Promise<LeverEntity[]> {
    return this.repo.findAll(positionId);
  }

  async findById(id: string): Promise<LeverEntity> {
    const entity = await this.repo.findById(id);
    if (!entity) throw new NotFoundException('Palanca no encontrada');
    return entity;
  }

  async update(
    id: string,
    dto: UpdateLeverDto,
    userId: string,
  ): Promise<LeverEntity> {
    const exists = await this.repo.findById(id);
    if (!exists) throw new NotFoundException('Palanca no encontrada');
    return this.repo.update(id, dto, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    const exists = await this.repo.findById(id);
    if (!exists) throw new NotFoundException('Palanca no encontrada');
    await this.repo.remove(id, userId);
  }

  async reorder(dto: ReorderLeverWrapperDto, userId: string): Promise<void> {
    await this.repo.reorder(dto.items, userId, dto.positionId);
  }
}
