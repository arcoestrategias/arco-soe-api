import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

  async findAllBybusinessUnitId(
    businessUnitId: string,
  ): Promise<PositionEntity[]> {
    return this.positionsRepo.findAllByBusinessUnitId(businessUnitId);
  }

  async findById(id: string): Promise<PositionEntity> {
    const position = await this.positionsRepo.findById(id);
    if (!position) throw new NotFoundException('Posición no encontrada');
    return position;
  }

  async listByCompanyGroupedByBusinessUnit(companyId: string) {
    return this.positionsRepo.findByCompanyGroupedByBusinessUnit(companyId);
  }

  async update(
    id: string,
    dto: UpdatePositionDto,
    userId: string,
  ): Promise<PositionEntity> {
    const exists = await this.positionsRepo.findById(id);
    if (!exists) throw new NotFoundException('Posición no encontrada');

    const targetBusinessUnitId = dto.businessUnitId;
    if (dto.isCeo === true) {
      const existingCeo = await this.positionsRepo.findCeoInBusinessUnit(
        targetBusinessUnitId!,
      );
      if (existingCeo && existingCeo.id !== id) {
        throw new ConflictException(
          'Ya existe un CEO en esta unidad de negocio',
        );
      }
    }

    return this.positionsRepo.update(id, dto, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    const exists = await this.positionsRepo.findById(id);
    if (!exists) throw new NotFoundException('Posición no encontrada');
    await this.positionsRepo.remove(id, userId);
  }
}
