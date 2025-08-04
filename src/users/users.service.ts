import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateUserDto,
  CreateUserWithRoleAndUnitDto,
  UpdateUserDto,
} from './dto';
import { UsersRepository } from './repositories/users.repository';
import { UserEntity } from './entities/user.entity';
import { handleDatabaseErrors } from 'src/common/helpers/database-error.helper';
import { hashPassword } from 'src/common/helpers/hash.helper';
import { CompaniesRepository } from 'src/companies/repositories/companies.repository';
import { RolesRepository } from 'src/roles/repositories/roles.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly companiesRepository: CompaniesRepository,
    private readonly rolesRepository: RolesRepository,
  ) {}

  async findAll(userId: string): Promise<UserEntity[]> {
    try {
      const currentUser = await this.usersRepository.findById(userId);

      if (!currentUser) {
        throw new ForbiddenException('Usuario no encontrado');
      }

      if (currentUser.isPlatformAdmin) {
        return this.usersRepository.findAll();
      }

      const companies =
        await this.companiesRepository.findCompaniesWhereUserIsManager(
          currentUser.id,
        );

      if (!companies.length) {
        throw new ForbiddenException(
          'No tienes permisos para acceder a esta información',
        );
      }

      const companyIds = companies.map((c) => c.id);

      return this.usersRepository.findByCompanyIds(companyIds);
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async findOne(id: string): Promise<UserEntity> {
    try {
      const user = await this.usersRepository.findById(id);

      if (!user) {
        throw new NotFoundException(`User with ID: ${id} not found`);
      }

      return user;
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserEntity> {
    try {
      await this.findOne(id);

      return await this.usersRepository.update(id, updateUserDto);
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async remove(id: string) {
    try {
      await this.findOne(id);

      return await this.usersRepository.remove(id);
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async findBusinessUnitInfo(
    userId: string,
    businessUnitId: string,
  ): Promise<{ id: string; name: string }> {
    const units = await this.findUnitsForUser(userId);
    const unit = units.find((u) => u.id === businessUnitId);
    if (!unit)
      throw new ForbiddenException(
        'Unidad de negocio no permitida para este usuario',
      );
    return unit;
  }

  async findUnitsForUser(
    userId: string,
  ): Promise<{ id: string; name: string }[]> {
    try {
      const units = await this.usersRepository.findUnitsForUser(userId);
      return units;
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  // async createUserWithRoleAndUnit(
  //   dto: CreateUserWithRoleAndUnitDto,
  // ): Promise<UserEntity> {
  //   // 1. Crear usuario
  //   const user = await this.usersRepository.create(dto);

  //   // 2. Vincular a unidad y rol
  //   await this.usersRepository.assignToBusinessUnit(
  //     user.id,
  //     dto.businessUnitId,
  //     dto.roleId,
  //   );

  //   // 3. Obtener permisos base del rol
  //   const rolePermissions = await this.rolesRepository.findPermissions(
  //     dto.roleId,
  //   );

  //   if (!rolePermissions.length) {
  //     throw new BadRequestException(
  //       'El rol seleccionado no tiene permisos asignados',
  //     );
  //   }

  //   // 4. Clonar permisos al usuario en esa unidad
  //   await this.usersRepository.bulkCreatePermissions(
  //     rolePermissions.map((p) => ({
  //       userId: user.id,
  //       businessUnitId: dto.businessUnitId,
  //       permissionId: p.permissionId,
  //       isAllowed: true,
  //     })),
  //   );

  //   return user;
  // }

  async createUserWithRoleAndUnit(
    dto: CreateUserWithRoleAndUnitDto,
  ): Promise<UserEntity> {
    // 1. Validaciones únicas
    const existingEmail = await this.usersRepository.findByEmail(dto.email);
    if (existingEmail)
      throw new ConflictException('El email ya está registrado');

    if (dto.ide) {
      const existingIde = await this.usersRepository.findByIde(dto.ide);
      if (existingIde)
        throw new ConflictException('La cédula ya está registrada');
    }

    if (dto.username) {
      const existingUsername = await this.usersRepository.findByUsername(
        dto.username,
      );
      if (existingUsername)
        throw new ConflictException('El nombre de usuario ya está en uso');
    }

    // 2. Generar contraseña por defecto
    const rawPassword = `SOE_${dto.ide}`;
    const hashedPassword = await hashPassword(rawPassword);
    dto.password = hashedPassword;

    // 3. Crear usuario
    const user = await this.usersRepository.create(dto);

    // 4. Asignar a unidad y rol
    await this.usersRepository.assignToBusinessUnit(
      user.id,
      dto.businessUnitId,
      dto.roleId,
    );

    // 5. Clonar permisos del rol
    const rolePermissions = await this.rolesRepository.findPermissions(
      dto.roleId,
    );

    if (!rolePermissions.length) {
      throw new BadRequestException(
        'El rol seleccionado no tiene permisos asignados',
      );
    }

    await this.usersRepository.bulkCreatePermissions(
      rolePermissions.map((p) => ({
        userId: user.id,
        businessUnitId: dto.businessUnitId,
        permissionId: p.permissionId,
        isAllowed: true,
      })),
    );

    return user;
  }
}
