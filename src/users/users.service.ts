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
  ResponseUserDto,
  UpdateUserDto,
} from './dto';
import { UsersRepository } from './repositories/users.repository';
import { UserEntity } from './entities/user.entity';
import { handleDatabaseErrors } from 'src/common/helpers/database-error.helper';
import { hashPassword } from 'src/common/helpers/hash.helper';
import { CompaniesRepository } from 'src/companies/repositories/companies.repository';
import { RolesRepository } from 'src/roles/repositories/roles.repository';
import { AssignUserToBusinessUnitDto } from './dto/assign-user-to-business-unit.dto';
import { UserAssignmentRepository } from './repositories/user-assignment.repository';
import { toResponseUserDto } from './mappers/to-response-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly companiesRepository: CompaniesRepository,
    private readonly rolesRepository: RolesRepository,
    private readonly assignmentRepo: UserAssignmentRepository,
  ) {}

  async createBasic(dto: CreateUserDto): Promise<UserEntity> {
    // Unicidad básica
    if (await this.usersRepository.findByEmail(dto.email)) {
      throw new ConflictException('El email ya está registrado');
    }
    if (!(dto as any).ide) {
      throw new BadRequestException('La cédula (ide) es obligatoria');
    }
    if (await this.usersRepository.findByIde((dto as any).ide)) {
      throw new ConflictException('La cédula ya está registrada');
    }
    if ((dto as any).username) {
      const existingUser = await this.usersRepository.findByUsername(
        (dto as any).username,
      );
      if (existingUser)
        throw new ConflictException('El username ya está registrado');
    }

    // Hash de contraseña
    const hashedPassword = await hashPassword(dto.password);
    dto.password = hashedPassword;

    // Crear
    return this.usersRepository.createBasic(dto);
  }

  async findAll(userId: string): Promise<Array<any>> {
    try {
      const currentUser = await this.usersRepository.findById(userId);
      if (!currentUser) {
        throw new ForbiddenException('Usuario no encontrado');
      }

      // ADMIN → TODOS con enlaces
      if (currentUser.isPlatformAdmin) {
        const rows = await this.usersRepository.findAllWithLinks();
        return rows.map((u) => ({
          ...u,
          userBusinessUnits:
            u.userBusinessUnits && u.userBusinessUnits.length > 0
              ? u.userBusinessUnits
              : null,
        }));
      }

      // NO ADMIN → por compañías donde es manager, con enlaces
      const companies =
        await this.companiesRepository.findCompaniesWhereUserIsManager(
          currentUser.id,
        );

      if (!companies?.length) {
        // Sin alcance → devolver vacío (o define la política que ya tengas)
        return [];
      }

      const companyIds = companies.map((c) => c.id);
      const rows =
        await this.usersRepository.findByCompanyIdsWithLinks(companyIds);

      return rows.map((u) => ({
        ...u,
        userBusinessUnits:
          u.userBusinessUnits && u.userBusinessUnits.length > 0
            ? u.userBusinessUnits
            : null,
      }));
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

  async findBusinessUnitInfoWithPosition(
    userId: string,
    businessUnitId: string,
  ): Promise<{
    id: string;
    name: string;
    positionId: string | null;
    positionName: string | null;
  } | null> {
    return this.usersRepository.findBusinessUnitInfoWithPosition(
      userId,
      businessUnitId,
    );
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
    const user = await this.usersRepository.createFull(dto);

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

  async assignToBusinessUnit(dto: AssignUserToBusinessUnitDto) {
    return this.assignmentRepo.assignExistingUserToBusinessUnit({
      userId: dto.userId,
      businessUnitId: dto.businessUnitId,
      roleId: dto.roleId,
      positionId: dto.positionId,
      isResponsible: dto.isResponsible ?? false,
      copyPermissions: dto.copyPermissions ?? true,
    });
  }

  async updateUserBusinessUnit(
    params: { userId: string; businessUnitId: string },
    dto: {
      roleId?: string | null;
      positionId?: string | null;
      isResponsible?: boolean;
    },
    actorId: string,
  ) {
    const { userId, businessUnitId } = params;

    // 1) Buscar vínculo
    const link = await this.assignmentRepo.findByUserAndBusinessUnit(
      userId,
      businessUnitId,
    );
    if (!link)
      throw new NotFoundException(
        'El vínculo usuario–unidad de negocio no existe',
      );

    // 2) Preparar update usando relaciones (NO roleId/positionId directos)
    const data: any = {
      isResponsible:
        typeof dto.isResponsible === 'boolean' ? dto.isResponsible : undefined,
      updatedBy: actorId,
    };

    if (dto.roleId !== undefined) {
      data.role = dto.roleId
        ? { connect: { id: dto.roleId } }
        : { disconnect: true };
    }
    if (dto.positionId !== undefined) {
      data.position = dto.positionId
        ? { connect: { id: dto.positionId } }
        : { disconnect: true };
    }

    // 3) Actualizar
    return this.assignmentRepo.updateByUserAndBusinessUnit(
      { userId, businessUnitId },
      data,
    );
  }

  async listByBusinessUnitId(
    businessUnitId: string,
  ): Promise<ResponseUserDto[]> {
    const links =
      await this.usersRepository.findUsersInBusinessUnitWithNames(
        businessUnitId,
      );

    // Por si acaso: deduplicar por usuario (1 user -> 1 elemento en la respuesta)
    const map = new Map<string, ResponseUserDto>();

    for (const l of links) {
      const existing = map.get(l.user.id);
      const linkDto = {
        businessUnitId: l.businessUnitId,
        businessUnitName: l.businessUnit?.name ?? '',
        positionId: l.position?.id ?? null,
        positionName: l.position?.name ?? null,
        roleId: l.role?.id ?? null,
        roleName: l.role?.name ?? null,
        isResponsible: !!l.isResponsible,
        isCeo: !!l.position?.isCeo,
      };

      if (!existing) {
        map.set(
          l.user.id,
          new ResponseUserDto({
            id: l.user.id,
            email: l.user.email,
            firstName: l.user.firstName,
            lastName: l.user.lastName,
            isActive: l.user.isActive,
            createdAt: l.user.createdAt,
            updatedAt: l.user.updatedAt,
            userBusinessUnits: [linkDto],
          }),
        );
      } else {
        // Si el mismo user tuviera más de un vínculo, lo agregamos
        existing.userBusinessUnits = [
          ...(existing.userBusinessUnits ?? []),
          linkDto,
        ];
      }
    }

    return Array.from(map.values());
  }
}
