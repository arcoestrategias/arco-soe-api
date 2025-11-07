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
import { PositionsRepository } from 'src/position/repositories/positions.repository';
import { generateSecurePassword } from 'src/common/helpers/generate-password';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly positionRepository: PositionsRepository,
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

  async listByCompanyGroupedByBusinessUnit(companyId: string) {
    return this.usersRepository.findByCompanyGroupedByBusinessUnit(companyId);
  }

  async findByBusinessUnit(businessUnitId: string): Promise<UserEntity[]> {
    return this.usersRepository.findByBusinessUnitId(businessUnitId);
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
    companyId: string;
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
  ): Promise<{ id: string; name: string; companyId: string }[]> {
    try {
      const units = await this.usersRepository.findUnitsForUser(userId);
      return units;
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async createUserWithRoleAndUnit(
    dto: CreateUserWithRoleAndUnitDto,
    actorId?: string, // opcional si quieres trazar quién creó
  ): Promise<UserEntity> {
    // 1) Validaciones únicas (igual que ya tienes)
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

    // 2) Password por defecto o generada desde el front
    console.log('Password front', dto.password);
    const passwordToHash = dto.password || generateSecurePassword();
    dto.password = await hashPassword(passwordToHash);

    // 3) Crear usuario
    const user = await this.usersRepository.createFull(dto);

    // 4) Asignar a BU + rol (y copiar permisos del rol) en una sola operación
    await this.assignmentRepo.assignExistingUserToBusinessUnit({
      userId: user.id,
      businessUnitId: dto.businessUnitId,
      roleId: dto.roleId, // obligatorio según tu DTO
      positionId: dto.positionId, // opcional; puede venir null/undefined
      isResponsible: !!dto.isResponsible,
      // para creación siempre copiamos permisos del rol
      copyPermissions: true,
      actorId,
    });

    return user;
  }

  // async assignToBusinessUnit(dto: AssignUserToBusinessUnitDto) {
  //   return this.assignmentRepo.assignExistingUserToBusinessUnit({
  //     userId: dto.userId,
  //     businessUnitId: dto.businessUnitId,
  //     roleId: dto.roleId,
  //     positionId: dto.positionId,
  //     isResponsible: dto.isResponsible ?? false,
  //     copyPermissions: dto.copyPermissions ?? true,
  //   });
  // }

  async updateUserBusinessUnit(
    params: { userId: string; businessUnitId: string }, // BU destino
    dto: {
      roleId?: string | null;
      positionId?: string | null;
      isResponsible?: boolean;
      fromBusinessUnitId?: string; // <- opcional para mover
    },
    actorId: string,
  ) {
    const { userId, businessUnitId: toBusinessUnitId } = params;

    // 1) Buscamos el vínculo destino (puede ser null)
    const targetLink = await this.assignmentRepo.findByUserAndBusinessUnit(
      userId,
      toBusinessUnitId,
    );

    // ===== Caso A: NO existe el vínculo en BU destino =====
    if (!targetLink) {
      // A.1) Si viene fromBusinessUnitId => MOVER (crea en destino y borra en origen)
      if (dto.fromBusinessUnitId) {
        await this.assignmentRepo.moveUserBetweenBusinessUnitsAtomic({
          userId,
          fromBusinessUnitId: dto.fromBusinessUnitId,
          toBusinessUnitId: toBusinessUnitId,
          roleId: dto.roleId ?? undefined, // normaliza null -> undefined
          positionId: dto.positionId === null ? undefined : dto.positionId, // create no acepta disconnect
          isResponsible: dto.isResponsible,
          actorId,
        });
        return this.assignmentRepo.findByUserAndBusinessUnit(
          userId,
          toBusinessUnitId,
        );
      }

      // A.2) Si NO viene fromBusinessUnitId => ASIGNACIÓN ADICIONAL (user en 2 BUs)
      await this.assignmentRepo.assignExistingUserToBusinessUnit({
        userId,
        businessUnitId: toBusinessUnitId,
        roleId: dto.roleId ?? undefined,
        positionId: dto.positionId === null ? undefined : dto.positionId,
        isResponsible: dto.isResponsible,
        actorId,
      });
      return this.assignmentRepo.findByUserAndBusinessUnit(
        userId,
        toBusinessUnitId,
      );
    }

    // ===== Caso B: SÍ existe el vínculo en BU destino =====
    // (a partir de aquí, TypeScript ya sabe que targetLink no es null)
    // Validaciones de posición si viene (puede mantener tus helpers actuales)
    if (dto.positionId !== undefined && dto.positionId !== null) {
      const pos = await this.positionRepository.findById(dto.positionId);
      if (!pos) throw new NotFoundException('Posición no encontrada');
      if (pos.businessUnitId !== toBusinessUnitId) {
        throw new BadRequestException(
          'La posición no pertenece a la unidad de negocio',
        );
      }
      const taken = await this.usersRepository.findUBUByPositionId(
        dto.positionId,
      );
      if (
        taken &&
        !(taken.userId === userId && taken.businessUnitId === toBusinessUnitId)
      ) {
        throw new ConflictException('La posición ya está ocupada');
      }
    }

    // Reglas de cambio de rol (solo si realmente cambia y no es null)
    const incomingRoleId = dto.roleId;
    const currentRoleId = targetLink.role?.id ?? null;
    const shouldChangeRole =
      incomingRoleId !== undefined &&
      incomingRoleId !== null &&
      incomingRoleId !== currentRoleId;

    await this.assignmentRepo.updateUserBusinessUnitAtomic({
      userId,
      businessUnitId: toBusinessUnitId,
      roleId: shouldChangeRole ? incomingRoleId! : undefined,
      positionId: dto.positionId, // undefined: no tocar; null: desconectar; string: conectar
      isResponsible: dto.isResponsible,
      actorId,
    });

    return this.assignmentRepo.findByUserAndBusinessUnit(
      userId,
      toBusinessUnitId,
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
