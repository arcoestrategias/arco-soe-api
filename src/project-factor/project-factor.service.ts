import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ProjectFactorRepository } from './repositories/project-factor.repository';
import { ProjectFactorEntity } from './entities/project-factor.entity';
import {
  CreateProjectFactorDto,
  UpdateProjectFactorDto,
  FilterProjectFactorDto,
  ReorderProjectFactorWrapperDto,
} from './dto';

@Injectable()
export class ProjectFactorService {
  constructor(private readonly factorRepository: ProjectFactorRepository) {}

  // CREATE con auto-orden + nombre único por proyecto
  async createFactor(
    dto: CreateProjectFactorDto,
    userId: string,
  ): Promise<ProjectFactorEntity> {
    await this.assertUniqueName(dto.projectId, dto.name);

    const nextOrder = await this.factorRepository.getNextOrderForProject(
      dto.projectId,
    );

    return this.factorRepository.create({
      ...dto,
      description: dto.description ?? null,
      result: dto.result ?? null,
      order: nextOrder,
      isActive: true,
      createdBy: userId ?? null,
      updatedBy: null,
    });
  }

  // UPDATE con unicidad y cambios parciales
  async updateFactor(
    factorId: string,
    dto: UpdateProjectFactorDto,
    userId: string,
  ): Promise<ProjectFactorEntity> {
    const existing = await this.factorRepository.findById(factorId);
    if (!existing) throw new NotFoundException('ProjectFactor not found');

    if (dto.name && dto.name !== existing.name) {
      await this.assertUniqueName(existing.projectId, dto.name, factorId);
    }

    return this.factorRepository.update(factorId, {
      ...dto,
      description: dto.description ?? existing.description ?? null,
      result: dto.result ?? existing.result ?? null,
      updatedBy: userId ?? null,
    });
  }

  // GET by Id
  async getFactorById(factorId: string): Promise<ProjectFactorEntity> {
    const factor = await this.factorRepository.findById(factorId);
    if (!factor) throw new NotFoundException('ProjectFactor not found');
    return factor;
  }

  // LIST by projectId (ordenado por order ASC)
  async listFactorsByProject(filters: FilterProjectFactorDto): Promise<{
    items: ProjectFactorEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.factorRepository.listByProject(filters.projectId, {
      isActive:
        typeof filters.isActive === 'boolean' ? filters.isActive : undefined,
      page: filters.page ?? 1,
      limit: filters.limit ?? 50,
    });
  }

  // REORDER por proyecto (order + isActive opcional)
  async reorderFactors(
    wrapper: ReorderProjectFactorWrapperDto,
  ): Promise<ProjectFactorEntity[]> {
    // Opcional: validar existencia de todos los IDs antes
    const ids = wrapper.items.map((i) => i.id);
    await this.ensureExisting(ids);

    return this.factorRepository.bulkReorderByProject(
      wrapper.projectId,
      wrapper.items,
    );
  }

  // TOGGLE ACTIVE con cascada a tareas
  async setFactorActive(
    factorId: string,
    isActive: boolean,
    userId: string,
  ): Promise<ProjectFactorEntity> {
    const existing = await this.factorRepository.findById(factorId);
    if (!existing) throw new NotFoundException('ProjectFactor not found');

    const updated = await this.factorRepository.setActive(
      factorId,
      isActive,
      userId ?? null,
    );

    if (!isActive) {
      await this.factorRepository.softDisableTasksByFactorId(
        factorId,
        userId ?? null,
      );
    }

    return updated;
  }

  // -------- Helpers --------
  private async assertUniqueName(
    projectId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const duplicated = await this.factorRepository.existsNameInProject(
      projectId,
      name,
      excludeId,
    );
    if (duplicated) {
      throw new BadRequestException(
        'Factor name must be unique within the project',
      );
    }
  }

  private async ensureExisting(ids: string[]): Promise<void> {
    const checks = await Promise.all(
      ids.map((id) => this.factorRepository.findById(id)),
    );
    const missingIndex = checks.findIndex((f) => !f);
    if (missingIndex !== -1) {
      throw new NotFoundException(
        `ProjectFactor not found: ${ids[missingIndex]}`,
      );
    }
  }
}
