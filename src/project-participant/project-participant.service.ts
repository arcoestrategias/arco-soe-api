import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CreateProjectParticipantDto } from './dto/create-project-participant.dto';
import { UpdateProjectParticipantDto } from './dto/update-project-participant.dto';
import { ProjectParticipantRepository } from './repositories/project-participant.repository';
import { ProjectParticipantEntity } from './entities/project-participant.entity';

@Injectable()
export class ProjectParticipantService {
  constructor(private readonly repo: ProjectParticipantRepository) {}

  async create(
    dto: CreateProjectParticipantDto,
    userId: string,
  ): Promise<ProjectParticipantEntity> {
    // Unicidad por (projectId, positionId)
    const duplicated = await this.repo.findByProjectAndPosition(
      dto.projectId,
      dto.positionId,
    );
    if (duplicated)
      throw new BadRequestException(
        'Participant already exists for this position in the project',
      );

    const created = await this.repo.create({
      projectId: dto.projectId,
      positionId: dto.positionId,
      isLeader: Boolean(dto.isLeader),
      createdBy: userId ?? null,
    });

    // Si se solicita líder, lo fijamos en exclusiva
    if (dto.isLeader) {
      await this.repo.setLeaderExclusive(
        dto.projectId,
        created.id,
        userId ?? null,
      );
      created.isLeader = true as any;
    }

    return new ProjectParticipantEntity(created);
  }

  async update(
    id: string,
    dto: UpdateProjectParticipantDto,
    userId: string,
  ): Promise<ProjectParticipantEntity> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('ProjectParticipant not found');

    // Si cambia positionId, validamos unicidad
    if (dto.positionId && dto.positionId !== existing.positionId) {
      const duplicated = await this.repo.findByProjectAndPosition(
        existing.projectId,
        dto.positionId,
      );
      if (duplicated)
        throw new BadRequestException(
          'Another participant already uses this position in the project',
        );
    }

    const updated = await this.repo.update(id, {
      positionId: dto.positionId,
      isLeader: dto.isLeader,
      isActive: dto.isActive,
      updatedBy: userId ?? null,
    });

    // Si se marcó líder, hacemos exclusivo
    if (typeof dto.isLeader === 'boolean' && dto.isLeader) {
      await this.repo.setLeaderExclusive(
        updated.projectId,
        updated.id,
        userId ?? null,
      );
      updated.isLeader = true as any;
    }

    return new ProjectParticipantEntity(updated);
  }

  async setActive(
    id: string,
    isActive: boolean,
    userId: string,
  ): Promise<ProjectParticipantEntity> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('ProjectParticipant not found');
    const updated = await this.repo.setActive(id, isActive, userId ?? null);
    return new ProjectParticipantEntity(updated);
  }

  async getById(id: string): Promise<ProjectParticipantEntity> {
    const row = await this.repo.findById(id);
    if (!row) throw new NotFoundException('ProjectParticipant not found');
    return new ProjectParticipantEntity(row);
  }

  async listByProject(
    projectId: string,
    opts: { page?: number; limit?: number; isActive?: boolean },
  ) {
    const pageData = await this.repo.listByProject(projectId, opts);
    return {
      ...pageData,
      items: pageData.items.map((r) => new ProjectParticipantEntity(r)),
    };
  }

  async listByPosition(
    positionId: string,
    opts: { page?: number; limit?: number; isActive?: boolean },
  ) {
    const pageData = await this.repo.listByPosition(positionId, opts);
    return {
      ...pageData,
      items: pageData.items.map((r) => new ProjectParticipantEntity(r)),
    };
  }
}
