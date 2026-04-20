import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ExternalUserRepository } from './repositories/external-user.repository';
import { ExternalUserEntity } from './entities/external-user.entity';
import { CreateExternalUserDto, UpdateExternalUserDto } from './dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ExternalUserService {
  constructor(
    private readonly repository: ExternalUserRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateExternalUserDto,
    companyId: string,
    userId: string,
  ): Promise<ExternalUserEntity> {
    const existing = await this.repository.findByEmail(dto.email, companyId);
    if (existing) {
      throw new BadRequestException(
        `Ya existe un usuario externo con el email ${dto.email} en esta empresa`,
      );
    }

    return this.repository.create({ ...dto, companyId, createdBy: userId });
  }

  async findOrCreate(
    name: string,
    email: string,
    companyId: string,
    userId: string,
  ): Promise<ExternalUserEntity> {
    const result = await this.repository.findOrCreate(
      name,
      email,
      companyId,
      userId,
    );
    return result.externalUser;
  }

  async update(
    id: string,
    dto: UpdateExternalUserDto,
    companyId: string,
    userId: string,
  ): Promise<ExternalUserEntity> {
    const existing = await this.repository.findById(id, companyId);
    if (!existing) {
      throw new NotFoundException('External user not found');
    }

    if (dto.email && dto.email !== existing.email) {
      const emailExists = await this.repository.findByEmail(
        dto.email,
        companyId,
      );
      if (emailExists) {
        throw new BadRequestException(`Email "${dto.email}" is already in use`);
      }
    }

    const wasActive = existing.isActive;
    const updated = await this.repository.update(id, companyId, {
      ...dto,
      updatedBy: userId,
    });

    if (wasActive && dto.isActive === false) {
      const result = await this.prisma.projectTaskParticipant.updateMany({
        where: { externalUserId: id, isActive: true },
        data: { isActive: false },
      });
      if (result.count > 0) {
        console.log(
          `[ExternalUser] ${result.count} task participants deactivated for user ${id}`,
        );
      }
    }

    return updated;
  }

  async findById(id: string, companyId: string): Promise<ExternalUserEntity> {
    const externalUser = await this.repository.findById(id, companyId);
    if (!externalUser) {
      throw new NotFoundException('External user not found');
    }
    return externalUser;
  }

  async findByEmail(
    email: string,
    companyId: string,
  ): Promise<ExternalUserEntity> {
    const externalUser = await this.repository.findByEmail(email, companyId);
    if (!externalUser) {
      throw new NotFoundException('External user not found');
    }
    return externalUser;
  }

  async list(opts: {
    companyId: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{
    items: ExternalUserEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.repository.findMany(opts);
  }
}
