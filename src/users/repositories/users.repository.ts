import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateUserDto,
  CreateUserWithRoleAndUnitDto,
  UpdateUserDto,
} from '../dto';
import { UserEntity } from '../entities/user.entity';
import { handleDatabaseErrors } from 'src/common/helpers/database-error.helper';

const userBusinessUnitSelect = {
  select: {
    businessUnitId: true,
    positionId: true,
    roleId: true,
    isResponsible: true,
  },
};

type UsersByBusinessUnitGroup = {
  businessUnitId: string;
  businessUnitName: string;
  users: Array<
    UserEntity & {
      roleId: string | null;
      roleName: string | null;
      positionId: string | null;
      positionName: string | null;
    }
  >;
};

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createBasic(data: CreateUserDto): Promise<UserEntity> {
    console.log('insertando');
    try {
      const user = await this.prisma.user.create({ data });
      return new UserEntity(user);
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async createFull(data: CreateUserWithRoleAndUnitDto): Promise<UserEntity> {
    const { businessUnitId, roleId, ...userData } = data;

    try {
      const user = await this.prisma.user.create({ data: userData });
      return new UserEntity(user);
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async findById(id: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? new UserEntity(user) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user ? new UserEntity(user) : null;
  }

  async findByIde(ide: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { ide } });
    return user ? new UserEntity(user) : null;
  }

  async findByUsername(username: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { username } });
    return user ? new UserEntity(user) : null;
  }

  async findByResetToken(token: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findFirst({
      where: { resetToken: token },
    });
    return user ? new UserEntity(user) : null;
  }

  async findAll(): Promise<UserEntity[]> {
    const users = await this.prisma.user.findMany();
    return users.map((user) => new UserEntity(user));
  }

  async findAllWithLinks(): Promise<Array<any>> {
    return this.prisma.user.findMany({
      include: {
        userBusinessUnits: userBusinessUnitSelect,
      },
    });
  }

  async findByCompanyIds(companyIds: string[]): Promise<UserEntity[]> {
    const units = await this.prisma.businessUnit.findMany({
      where: { companyId: { in: companyIds } },
      select: { id: true },
    });

    const unitIds = units.map((u) => u.id);

    const users = await this.prisma.user.findMany({
      where: {
        userBusinessUnits: {
          some: {
            businessUnitId: { in: unitIds },
          },
        },
      },
    });

    return users.map((user) => new UserEntity(user));
  }

  async findByCompanyIdsWithLinks(companyIds: string[]): Promise<Array<any>> {
    const units = await this.prisma.businessUnit.findMany({
      where: { companyId: { in: companyIds } },
      select: { id: true },
    });
    const unitIds = units.map((u) => u.id);

    return this.prisma.user.findMany({
      where: {
        userBusinessUnits: { some: { businessUnitId: { in: unitIds } } },
      },
      include: {
        userBusinessUnits: userBusinessUnitSelect,
      },
    });
  }

  async findByBusinessUnitId(businessUnitId: string): Promise<UserEntity[]> {
    const users = await this.prisma.user.findMany({
      where: { userBusinessUnits: { some: { businessUnitId } } },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
    return users.map((u) => new UserEntity(u));
  }

  /**
   * Lista todos los usuarios de una company agrupados por unidad de negocio.
   * Si un usuario pertenece a 2 BU, aparecerá en ambos grupos.
   */
  async findByCompanyGroupedByBusinessUnit(
    companyId: string,
  ): Promise<UsersByBusinessUnitGroup[]> {
    try {
      // 1) Traer TODAS las unidades de la compañía (aunque no tengan usuarios)
      const businessUnits = await this.prisma.businessUnit.findMany({
        where: { companyId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });

      // 2) Traer los memberships que SÍ existen (usuarios por BU)
      const memberships = await this.prisma.userBusinessUnit.findMany({
        where: { businessUnit: { companyId } },
        include: {
          businessUnit: { select: { id: true, name: true } },
          user: true, // UserEntity hará el shape estándar
          role: { select: { id: true, name: true } },
          position: { select: { id: true, name: true } },
        },
        orderBy: [
          { businessUnit: { name: 'asc' } },
          { user: { lastName: 'asc' } },
          { user: { firstName: 'asc' } },
        ],
      });

      // 3) Sembrar el mapa con TODAS las unidades (usuarios vacíos por defecto)
      const map = new Map<string, UsersByBusinessUnitGroup>();
      for (const bu of businessUnits) {
        map.set(bu.id, {
          businessUnitId: bu.id,
          businessUnitName: bu.name,
          users: [],
        });
      }

      // 4) Rellenar con los usuarios encontrados
      for (const m of memberships) {
        const buId = m.businessUnit.id;

        // (si por algún motivo llegó un membership de una BU que no vino arriba, la creamos)
        if (!map.has(buId)) {
          map.set(buId, {
            businessUnitId: buId,
            businessUnitName: m.businessUnit.name,
            users: [],
          });
        }

        const group = map.get(buId)!;
        const userEntity = new UserEntity(m.user);

        group.users.push({
          ...(userEntity as any),
          roleId: m.role?.id ?? null,
          roleName: m.role?.name ?? null,
          positionId: m.position?.id ?? null,
          positionName: m.position?.name ?? null,
        });
      }

      // 5) Devolver en el mismo orden de businessUnits (ya ordenadas por nombre)
      return businessUnits.map((bu) => map.get(bu.id)!);
    } catch (err) {
      handleDatabaseErrors(err);
    }
  }

  async findBusinessUnitInfoWithPosition(
    userId: string,
    businessUnitId: string,
  ): Promise<{
    id: string;
    name: string;
    companyId: string;
    positionId: string | null;
    positionName: string | null;
  } | null> {
    // Usar la PK compuesta; más preciso que findFirst
    const link = await this.prisma.userBusinessUnit.findUnique({
      where: { userId_businessUnitId: { userId, businessUnitId } },
      select: {
        businessUnit: { select: { id: true, name: true, companyId: true } },
        position: { select: { id: true, name: true } }, // puede venir null y está OK
      },
    });

    if (!link) return null;

    return {
      id: link.businessUnit.id,
      name: link.businessUnit.name,
      companyId: link.businessUnit.companyId,
      positionId: link.position?.id ?? null,
      positionName: link.position?.name ?? null,
    };
  }

  async update(id: string, data: UpdateUserDto): Promise<UserEntity> {
    try {
      const user = await this.prisma.user.update({ where: { id }, data });
      return new UserEntity(user);
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.user.delete({ where: { id } });
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  /**
   * Esta función solo tiene sentido si deseas conocer el rol
   * asignado a un usuario en una unidad de negocio específica,
   * por ejemplo para mostrar en UI (no para validación de acceso).
   */
  async findByIdWithRoleInUnit(
    userId: string,
    businessUnitId: string,
  ): Promise<{ id: string; roleId: string | null } | null> {
    const userUnit = await this.prisma.userBusinessUnit.findFirst({
      where: { userId, businessUnitId },
      select: {
        user: { select: { id: true } },
        roleId: true,
      },
    });

    if (!userUnit) return null;

    return {
      id: userUnit.user.id,
      roleId: userUnit.roleId ?? null,
    };
  }

  async findUnitsForUser(
    userId: string,
  ): Promise<{ id: string; name: string; companyId: string }[]> {
    const links = await this.prisma.userBusinessUnit.findMany({
      where: { userId },
      select: {
        businessUnit: {
          select: {
            id: true,
            name: true,
            companyId: true,
          },
        },
      },
    });

    return links.map((l) => l.businessUnit);
  }

  // async assignToBusinessUnit(
  //   userId: string,
  //   businessUnitId: string,
  //   roleId: string,
  // ): Promise<void> {
  //   await this.prisma.userBusinessUnit.create({
  //     data: {
  //       userId,
  //       businessUnitId,
  //       roleId,
  //     },
  //   });
  // }

  // async bulkCreatePermissions(
  //   data: {
  //     userId: string;
  //     businessUnitId: string;
  //     permissionId: string;
  //     isAllowed: boolean;
  //   }[],
  // ): Promise<void> {
  //   if (!data.length) return;

  //   await this.prisma.userPermission.createMany({
  //     data,
  //     skipDuplicates: true,
  //   });
  // }

  async findUsersGroupedByBusinessUnit(companyId: string) {
    return this.prisma.userBusinessUnit.findMany({
      where: {
        businessUnit: {
          companyId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
          },
        },
        businessUnit: {
          select: {
            id: true,
            name: true,
          },
        },
        position: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async findByEmailConfirmToken(token: string) {
    const row = await this.prisma.user.findFirst({
      where: { emailConfirmToken: token, isActive: true },
    });
    return row ? new UserEntity(row) : null;
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    where?: any;
    orderBy?: any;
  }) {
    const { skip, take, where, orderBy } = params ?? {};

    return this.prisma.user.findMany({
      skip,
      take,
      where,
      orderBy,
      include: {
        // Traemos SOLO lo necesario de UserBusinessUnit
        userBusinessUnits: {
          select: {
            businessUnitId: true,
            positionId: true,
            roleId: true,
            isResponsible: true,
          },
        },
      },
    });
  }

  async findUsersInBusinessUnitWithNames(businessUnitId: string) {
    const links = await this.prisma.userBusinessUnit.findMany({
      where: { businessUnitId },
      orderBy: [{ user: { lastName: 'asc' } }, { user: { firstName: 'asc' } }],
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        businessUnit: { select: { name: true } },
        role: { select: { id: true, name: true } },
        position: { select: { id: true, name: true, isCeo: true } },
      },
    });

    return links;
  }

  // **Nuevos helpers para asiganciones
  findUBUByPositionId(positionId: string) {
    return this.prisma.userBusinessUnit.findFirst({
      where: { positionId },
      select: { userId: true, businessUnitId: true },
    });
  }

  // findPermissionsByRoleId(roleId: string) {
  //   return this.prisma.rolePermission.findMany({
  //     where: { roleId },
  //     select: { permissionId: true },
  //   });
  // }

  bulkUpsertUserPermissions(params: {
    userId: string;
    businessUnitId: string;
    permissionIds: string[];
    actorId?: string;
  }) {
    const { userId, businessUnitId, permissionIds, actorId } = params;
    if (!permissionIds.length) return Promise.resolve();

    return this.prisma.userPermission.createMany({
      data: permissionIds.map((permissionId) => ({
        userId,
        businessUnitId,
        permissionId,
        createdBy: actorId ?? null,
        updatedBy: actorId ?? null,
      })),
      skipDuplicates: true,
    });
  }

  async findInvalidUserIdsForCompany(
    userIds: string[],
    companyId: string,
  ): Promise<string[]> {
    if (userIds.length === 0) {
      return [];
    }

    // 1. Buscar las unidades de negocio de esa company
    const businessUnits = await this.prisma.businessUnit.findMany({
      where: { companyId },
      select: { id: true },
    });

    const businessUnitIds = businessUnits.map((bu) => bu.id);

    if (businessUnitIds.length === 0) {
      return userIds;
    }

    // 2. Buscar los usuarios de esas unidades de negocio en UserBusinessUnit
    const validUserLinks = await this.prisma.userBusinessUnit.findMany({
      where: {
        userId: { in: userIds },
        businessUnitId: { in: businessUnitIds },
      },
      select: {
        userId: true,
      },
      distinct: ['userId'], // We only need to know if a user is in at least one BU of the company.
    });

    const validUserIds = new Set(validUserLinks.map((link) => link.userId));
    const invalidUserIds = userIds.filter((id) => !validUserIds.has(id));
    return invalidUserIds;
  }

  async findActivePermissionNames(
    userId: string,
    businessUnitId: string,
  ): Promise<string[]> {
    const results = await this.prisma.userPermission.findMany({
      where: {
        userId,
        businessUnitId,
        isAllowed: true, // El usuario debe tener el permiso habilitado
        permission: { isActive: true }, // El permiso debe existir y estar activo en el sistema
      },
      select: { permission: { select: { name: true } } },
    });
    return results.map((r) => r.permission.name);
  }
}
