import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from '../dto';
import { UserEntity } from '../entities/user.entity';
import { handleDatabaseErrors } from 'src/common/helpers/database-error.helper';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUserDto): Promise<UserEntity> {
    const { roleId, ...rest } = data;
    const prismaData: any = { ...rest };

    if (roleId) {
      prismaData.role = { connect: { id: roleId } };
    }

    try {
      const user = await this.prisma.user.create({ data: prismaData });
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

  // Este método se utiliza exclusivamente para JwtStrategy: retorna solo id y roleId del usuario
  async findByIdWithRole(
    id: string,
  ): Promise<Pick<User, 'id' | 'roleId'> | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        roleId: true,
      },
    });
  }
}
