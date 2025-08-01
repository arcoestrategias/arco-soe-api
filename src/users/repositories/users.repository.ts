import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from '../dto';
import { UserEntity } from '../entities/user.entity';
import { handleDatabaseErrors } from 'src/common/helpers/database-error.helper';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUserDto): Promise<UserEntity> {
    try {
      const user = await this.prisma.user.create({ data });
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
}
