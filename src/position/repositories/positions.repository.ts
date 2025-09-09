import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { handleDatabaseErrors } from 'src/common/helpers/database-error.helper';
import { CreatePositionDto, UpdatePositionDto } from '../dto';
import { PositionEntity } from '../entities/position.entity';
import { Prisma } from '@prisma/client';

export type PositionWithNames = PositionEntity & {
  businessUnitName: string;
  userFullName: string | null;
};

type PositionsByBusinessUnitGroup = {
  businessUnitId: string;
  businessUnitName: string;
  positions: Array<
    PositionEntity & {
      userId: string | null;
      userName: string | null;
    }
  >;
};

@Injectable()
export class PositionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private buildUserFullName(
    user?: {
      firstName: string | null;
      lastName: string | null;
      username: string | null;
      email: string;
    } | null,
  ): string | null {
    if (!user) return null;
    const full = [user.firstName, user.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    return full || user.username || user.email || null;
  }

  private mapToWithNames(row: any): PositionWithNames {
    const { businessUnit, user, ...base } = row;
    return {
      ...base,
      businessUnitName: businessUnit?.name ?? '',
      userFullName: this.buildUserFullName(user ?? null),
    };
  }

  async create(
    data: CreatePositionDto,
    userId: string,
  ): Promise<PositionEntity> {
    try {
      const position = await this.prisma.position.create({
        data: {
          ...data,
          createdBy: userId,
          updatedBy: userId,
        },
      });
      return new PositionEntity(position);
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async findAll(): Promise<PositionWithNames[]> {
    const rows = await this.prisma.position.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        businessUnit: { select: { name: true } },
      },
    });

    return rows.map((r) => this.mapToWithNames(r));
  }

  async findAllByBusinessUnitId(
    businessUnitId: string,
  ): Promise<PositionWithNames[]> {
    const rows = await this.prisma.position.findMany({
      where: { businessUnitId },
      orderBy: { createdAt: 'desc' },
      include: {
        businessUnit: { select: { name: true } },
      },
    });

    return rows.map((r) => this.mapToWithNames(r));
  }

  async findById(id: string): Promise<PositionEntity | null> {
    const position = await this.prisma.position.findUnique({
      where: { id },
    });
    return position ? new PositionEntity(position) : null;
  }

  async findCeoInBusinessUnit(businessUnitId: string) {
    return this.prisma.position.findFirst({
      where: { businessUnitId, isCeo: true },
      select: { id: true, name: true, businessUnitId: true },
    });
  }

  async findByCompanyGroupedByBusinessUnit(
    companyId: string,
  ): Promise<PositionsByBusinessUnitGroup[]> {
    try {
      // 1) Traer TODAS las unidades de negocio (para incluir las vacías)
      const businessUnits = await this.prisma.businessUnit.findMany({
        where: { companyId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });

      // 2) Traer TODAS las posiciones de la company (vía relación con BU)
      const positions = await this.prisma.position.findMany({
        where: { businessUnit: { companyId } },
        include: {
          businessUnit: { select: { id: true, name: true } },
        },
        orderBy: [{ businessUnit: { name: 'asc' } }, { name: 'asc' }],
      });

      // 3) Traer las asignaciones (UBU) para esas posiciones y obtener el usuario ocupante
      const positionIds = positions.map((p) => p.id);
      const links = positionIds.length
        ? await this.prisma.userBusinessUnit.findMany({
            where: { positionId: { in: positionIds } },
            select: {
              positionId: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  username: true,
                  email: true,
                },
              },
            },
          })
        : [];

      const linkByPositionId = new Map<string, (typeof links)[number]>();
      for (const l of links) {
        if (l.positionId) linkByPositionId.set(l.positionId, l);
      }

      // 4) Sembrar el mapa con TODAS las BU (vacías por defecto)
      const map = new Map<string, PositionsByBusinessUnitGroup>();
      for (const bu of businessUnits) {
        map.set(bu.id, {
          businessUnitId: bu.id,
          businessUnitName: bu.name,
          positions: [],
        });
      }

      // 5) Rellenar con posiciones y su ocupante (si lo hay) via UBU
      for (const r of positions) {
        const buId = r.businessUnit.id;
        const buName = r.businessUnit.name;

        // Por seguridad si llegara una BU que no estaba (no debería)
        if (!map.has(buId)) {
          map.set(buId, {
            businessUnitId: buId,
            businessUnitName: buName,
            positions: [],
          });
        }

        const group = map.get(buId)!;

        // ⚠️ OJO: Position ya NO tiene user, el ocupante sale de UBU
        const link = linkByPositionId.get(r.id);
        const userId = link?.user?.id ?? null;
        const userName = this.buildUserFullName(link?.user) ?? null;

        const entity = new PositionEntity({
          ...r,
          businessUnitName: buName, // si tu entity lo usa como enriquecido
          // userFullName ya no viene de Position; si tu entity aún lo tiene, pásalo como null
          userFullName: userName,
        });

        group.positions.push({
          ...(entity as any),
          userId,
          userName,
        });
      }

      // 6) Devolver en el orden de businessUnits (incluye las vacías)
      return businessUnits.map((bu) => map.get(bu.id)!);
    } catch (err) {
      handleDatabaseErrors(err);
    }
  }

  async update(
    id: string,
    data: UpdatePositionDto,
    userId: string,
  ): Promise<PositionEntity> {
    try {
      const position = await this.prisma.position.update({
        where: { id },
        data: {
          ...data,
          updatedBy: userId,
        },
      });
      return new PositionEntity(position);
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    try {
      await this.prisma.position.update({
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

  async createWithTransaction(
    data: CreatePositionDto,
    userId: string,
    tx: Prisma.TransactionClient,
  ): Promise<PositionEntity> {
    try {
      const position = await tx.position.create({
        data: {
          ...data,
          createdBy: userId,
          updatedBy: userId,
        },
      });
      return new PositionEntity(position);
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }
}
