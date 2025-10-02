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

type Nullable<T> = { [K in keyof T]: T[K] | null };

export type PersonRolePosition = {
  idUser: string | null;
  nameUser: string | null;
  idRole: string | null;
  nameRole: string | null;
  idPosition: string | null;
  namePosition: string | null;
};

export type CeoAndSpecialist = {
  ceo: PersonRolePosition;
  specialist: PersonRolePosition;
};

// Puedes centralizar estos shortcodes si ya existen en tus constants
const ROLE_SC = {
  CEO: 'CEO',
  SPECIALIST: 'SPECIALIST',
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

  /**
   * Devuelve, para una company+BU, la persona/rol/posición del CEO y del Especialista.
   * - CEO: por convención tuya, es la posición con isCeo=true en la BU, y su ocupante actual (vía UserBusinessUnit).
   * - Especialista: ocupante en esa BU cuyo rol tenga shortCode = 'SPECIALIST' (fallback: name LIKE '%especialista%').
   * - Si algo falta, los campos se devuelven como null (no rompe el reporte).
   */
  async findCeoAndSpecialistByCompanyAndBU(
    companyId: string,
    businessUnitId: string,
  ): Promise<CeoAndSpecialist> {
    try {
      // 1) Posición CEO en la BU (según tu modelo)
      const ceoPosition = await this.prisma.position.findFirst({
        where: { businessUnitId, isCeo: true, businessUnit: { companyId } },
        select: { id: true, name: true },
      });

      // 2) Ocupante de esa posición (si existe)
      // Nota: si manejas "vigencia" o múltiples ocupantes, aquí tomamos el más reciente
      const ceoUBU = ceoPosition
        ? await this.prisma.userBusinessUnit.findFirst({
            where: { positionId: ceoPosition.id },
            select: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  username: true,
                  email: true,
                },
              },
              role: { select: { id: true, name: true } },
            },
          })
        : null;

      const ceo: PersonRolePosition = {
        idUser: ceoUBU?.user?.id ?? null,
        nameUser: this.buildUserFullName(ceoUBU?.user ?? null),
        idRole: ceoUBU?.role?.id ?? null,
        nameRole: ceoUBU?.role?.name ?? null,
        idPosition: ceoPosition?.id ?? null,
        namePosition: ceoPosition?.name ?? null,
      };

      // 3) Especialista en la BU (por rol del UBU)
      // Preferimos shortCode = 'SPECIALIST'; si tu data aún no lo tiene homogéneo, hacemos fallback por nombre.
      const specialistUBU = await this.prisma.userBusinessUnit.findFirst({
        where: {
          businessUnitId,
          // posición pertenece a la misma company (protección extra):
          position: { businessUnit: { companyId } },
          OR: [
            {
              role: { name: { contains: 'specialist', mode: 'insensitive' } },
            },
          ],
        },
        select: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true,
              email: true,
            },
          },
          role: { select: { id: true, name: true } },
          position: { select: { id: true, name: true } },
        },
      });

      const specialist: PersonRolePosition = {
        idUser: specialistUBU?.user?.id ?? null,
        nameUser: this.buildUserFullName(specialistUBU?.user ?? null),
        idRole: specialistUBU?.role?.id ?? null,
        nameRole: specialistUBU?.role?.name ?? null,
        idPosition: specialistUBU?.position?.id ?? null,
        namePosition: specialistUBU?.position?.name ?? null,
      };

      return { ceo, specialist };
    } catch (err) {
      handleDatabaseErrors(err);
    }
  }

  /**
   * Dado companyId + businessUnitId + positionId, retorna datos del ocupante actual
   * (usuario + rol) y la posición. Si no hay ocupante/rol, esos campos van null.
   */
  async findUserRolePositionByCompanyBUPosition(
    companyId: string,
    businessUnitId: string,
    positionId: string,
  ): Promise<PersonRolePosition> {
    try {
      // Validar que la posición pertenezca a la BU y a la company
      const pos = await this.prisma.position.findFirst({
        where: { id: positionId, businessUnitId, businessUnit: { companyId } },
        select: { id: true, name: true },
      });

      if (!pos) {
        // Posición inválida para la BU/Company: devolvemos objeto nulo con idPosition null
        return {
          idUser: null,
          nameUser: null,
          idRole: null,
          nameRole: null,
          idPosition: null,
          namePosition: null,
        };
      }

      // Buscar el vínculo UBU más reciente (ocupante actual)
      const ubu = await this.prisma.userBusinessUnit.findFirst({
        where: { positionId: pos.id },
        select: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true,
              email: true,
            },
          },
          role: { select: { id: true, name: true } },
        },
      });

      return {
        idUser: ubu?.user?.id ?? null,
        nameUser: this.buildUserFullName(ubu?.user ?? null),
        idRole: ubu?.role?.id ?? null,
        nameRole: ubu?.role?.name ?? null,
        idPosition: pos.id,
        namePosition: pos.name,
      };
    } catch (err) {
      handleDatabaseErrors(err);
    }
  }
}
