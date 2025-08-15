import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProjectFactorEntity } from '../entities/project-factor.entity';
import { CreateProjectFactorDto, UpdateProjectFactorDto } from '../dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ProjectFactorRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ------- Crear / Actualizar / Activar -------
  async create(
    dto: CreateProjectFactorDto & {
      isActive?: boolean;
      createdBy?: string | null;
      updatedBy?: string | null;
    },
  ): Promise<ProjectFactorEntity> {
    const data: Prisma.ProjectFactorUncheckedCreateInput = { ...dto };
    const created = await this.prisma.projectFactor.create({ data });
    return new ProjectFactorEntity(created);
  }

  async update(
    id: string,
    dto: UpdateProjectFactorDto & { updatedBy?: string | null },
  ): Promise<ProjectFactorEntity> {
    const data: Prisma.ProjectFactorUncheckedUpdateInput = { ...dto };
    const updated = await this.prisma.projectFactor.update({
      where: { id },
      data,
    });
    return new ProjectFactorEntity(updated);
  }

  async setActive(
    id: string,
    isActive: boolean,
    updatedBy?: string | null,
  ): Promise<ProjectFactorEntity> {
    const updated = await this.prisma.projectFactor.update({
      where: { id },
      data: { isActive, updatedBy: updatedBy ?? null },
    });
    return new ProjectFactorEntity(updated);
  }

  // ------- Obtener / Listar -------
  async findById(id: string): Promise<ProjectFactorEntity | null> {
    const row = await this.prisma.projectFactor.findUnique({ where: { id } });
    return row ? new ProjectFactorEntity(row) : null;
  }

  async listByProject(
    projectId: string,
    opts?: { isActive?: boolean; page?: number; limit?: number },
  ): Promise<{
    items: ProjectFactorEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = opts?.page ?? 1;
    const limit = opts?.limit ?? 50;

    const where: Prisma.ProjectFactorWhereInput = {
      projectId,
      ...(typeof opts?.isActive === 'boolean'
        ? { isActive: opts.isActive }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.projectFactor.findMany({
        where,
        orderBy: { order: 'asc' }, // SIEMPRE por order
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.projectFactor.count({ where }),
    ]);

    return {
      items: rows.map((r) => new ProjectFactorEntity(r)),
      total,
      page,
      limit,
    };
  }

  // ------- Orden automático por proyecto -------
  async getNextOrderForProject(projectId: string): Promise<number> {
    const last = await this.prisma.projectFactor.findFirst({
      where: { projectId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    return (last?.order ?? 0) + 1;
  }

  // ------- Reorder por proyecto -------
  async bulkReorderByProject(
    projectId: string,
    items: { id: string; order: number; isActive?: boolean }[],
  ): Promise<ProjectFactorEntity[]> {
    // Validar pertenencia
    const rows = await this.prisma.projectFactor.findMany({
      where: { id: { in: items.map((i) => i.id) } },
      select: { id: true, projectId: true },
    });
    const alien = rows.find((r) => r.projectId !== projectId);
    if (alien) {
      throw new Error(
        `Factor ${alien.id} does not belong to projectId ${projectId}`,
      );
    }

    const updated = await this.prisma.$transaction(
      items.map((i) =>
        this.prisma.projectFactor.update({
          where: { id: i.id },
          data: {
            order: i.order,
            ...(typeof i.isActive === 'boolean'
              ? { isActive: i.isActive }
              : {}),
          },
        }),
      ),
    );

    return updated.map((u) => new ProjectFactorEntity(u));
  }

  // ------- Cascada lógica sobre tareas (cuando se inactiva un factor) -------
  async softDisableTasksByFactorId(
    factorId: string,
    updatedBy?: string | null,
  ): Promise<void> {
    await this.prisma.projectTask.updateMany({
      where: { projectFactorId: factorId, isActive: true },
      data: { isActive: false, updatedBy: updatedBy ?? null },
    });
  }

  // ------- Unicidad de nombre por proyecto (regla de negocio) -------
  async existsNameInProject(
    projectId: string,
    name: string,
    excludeId?: string,
  ): Promise<boolean> {
    const found = await this.prisma.projectFactor.findFirst({
      where: {
        projectId,
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    return !!found;
  }

  async setActiveByProject(
    projectId: string,
    isActive: boolean,
    updatedBy?: string | null,
  ): Promise<void> {
    // obtenemos IDs de factores para actualizar tareas
    const factors = await this.prisma.projectFactor.findMany({
      where: { projectId },
      select: { id: true },
    });

    // actualizar factores
    await this.prisma.projectFactor.updateMany({
      where: { projectId },
      data: { isActive, updatedBy: updatedBy ?? null },
    });

    // actualizar tareas de esos factores (si hay)
    if (factors.length > 0) {
      const factorIds = factors.map((f) => f.id);
      await this.prisma.projectTask.updateMany({
        where: { projectFactorId: { in: factorIds } },
        data: { isActive, updatedBy: updatedBy ?? null },
      });
    }
  }
}
