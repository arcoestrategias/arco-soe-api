import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  ResponseUserDto,
  CreateUserWithRoleAndUnitDto,
} from './dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/core/guards/permissions.guard';
import { Permissions } from 'src/core/decorators/permissions.decorator';
import { PERMISSIONS } from 'src/common/constants/permissions.constant';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { CurrentUserPayload } from 'src/auth/interfaces/current-user.interface';
import { SuccessMessage } from 'src/core/decorators/success-message.decorator';
import { BusinessUnitId } from 'src/common/decorators/business-unit-id.decorator';
import { BusinessUnitsService } from 'src/business-unit/business-unit.service';
import { AssignUserToBusinessUnitDto } from './dto/assign-user-to-business-unit.dto';
import { CompaniesRepository } from 'src/companies/repositories/companies.repository';
import { PermissionValidatorService } from 'src/core/services/permission-validator.service';
import { v4 as uuidv4 } from 'uuid';
import { NotificationService } from 'src/notifications/notifications.service';
import { buildUrl } from 'src/common/helpers/url.helper';
import { UpdateUserBusinessUnitDto } from './dto/update-user-business-unit.dto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly businessUnitService: BusinessUnitsService,
    private readonly permissionValidator: PermissionValidatorService,
    private readonly companiesRepo: CompaniesRepository,
    private readonly notificationService: NotificationService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.USERS.UPDATE)
  @SuccessMessage('Correo de confirmación enviado')
  @Post(':id/send-confirmation-email')
  async sendConfirmationEmail(@Param('id') userId: string) {
    const user = await this.usersService.findOne(userId);
    if (!user) throw new NotFoundException('User not found');

    const token = uuidv4();
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 60 min

    await this.usersService.update(userId, {
      emailConfirmToken: token,
      emailConfirmExpiresAt: expires,
    } as any);

    await this.notificationService.sendByCode({
      codeTemplate: 'T01',
      to: user.email,
      variables: {
        firstname: user.firstName ?? user.username ?? 'usuario',
        url: buildUrl(`/auth/confirm?token=${token}`),
        contact: buildUrl('/ayuda'),
      },
    });

    return { success: true };
  }

  @Get('company/:companyId/group-by-business-unit')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.USERS.READ)
  @SuccessMessage('Operación exitosa')
  async findByCompanyGroupedByBusinessUnit(
    @Param('companyId') companyId: string,
  ) {
    return this.usersService.listByCompanyGroupedByBusinessUnit(companyId);
  }

  @Get('business-unit/:businessUnitId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.USERS.READ)
  @SuccessMessage('Users listados satisfactoriamente')
  async findByBusinessUnit(
    @Param('businessUnitId') businessUnitId: string,
  ): Promise<ResponseUserDto[]> {
    const users = await this.usersService.findByBusinessUnit(businessUnitId);
    return users.map((u) => new ResponseUserDto(u));
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(
    @CurrentUser() user: CurrentUserPayload,
    @BusinessUnitId() businessUnitId?: string,
  ) {
    const userId = user.sub;
    const userEntity = await this.usersService.findOne(userId);

    // ADMIN
    const isAdmin = await this.permissionValidator.isPlatformAdmin(userId);
    if (isAdmin) {
      const companies = await this.companiesRepo.findAllWithUnits();
      return {
        ...userEntity.toResponse(),
        isPlatformAdmin: true,
        currentCompanyId: null,
        currentBusinessUnit: null,
        permissions: null,
        needsBusinessUnit: false, // ← admin: siempre false
        businessUnits: [],
        companies,
      };
    }

    // NO-ADMIN
    const units = await this.usersService.findUnitsForUser(userId);
    const hasBusinessUnits = !!units?.length; // ← única fuente de verdad

    // Sin unidades
    if (!hasBusinessUnits) {
      return {
        ...userEntity.toResponse(),
        isPlatformAdmin: false,
        currentCompanyId: null,
        currentBusinessUnit: null,
        permissions: null,
        needsBusinessUnit: false, // ← no tiene BUs
        businessUnits: [],
      };
    }

    // Varias unidades y sin header → aún no seleccionada
    if (!businessUnitId && units.length > 1) {
      return {
        ...userEntity.toResponse(),
        isPlatformAdmin: false,
        currentCompanyId: null,
        currentBusinessUnit: null,
        permissions: null,
        needsBusinessUnit: true, // ← sí tiene BUs
        businessUnits: units,
      };
    }

    // Resolver BU actual (1 sola o vino header)
    if (!businessUnitId) businessUnitId = units[0].id;

    const buWithPos = await this.usersService.findBusinessUnitInfoWithPosition(
      userId,
      businessUnitId,
    );
    if (!buWithPos) {
      // Header inválido o usuario no pertenece a esa BU
      return {
        ...userEntity.toResponse(),
        isPlatformAdmin: false,
        currentCompanyId: null,
        currentBusinessUnit: null,
        permissions: null,
        needsBusinessUnit: true, // ← sí tiene BUs (pero BU actual inválida)
        businessUnits: units, // ← ya incluyen companyId
      };
    }

    const permissions =
      await this.businessUnitService.getUserPermissionsByModule(
        businessUnitId,
        userId,
      );

    return {
      ...userEntity.toResponse(),
      isPlatformAdmin: false,
      currentCompanyId: buWithPos.companyId,
      currentBusinessUnit: {
        id: buWithPos.id,
        name: buWithPos.name,
        companyId: buWithPos.companyId,
        positionId: buWithPos.positionId,
        positionName: buWithPos.positionName,
      },
      permissions,
      needsBusinessUnit: true, // ← sí tiene BUs (aunque ya esté resuelta)
      businessUnits: units,
    };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.USERS.READ)
  @Get()
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ResponseUserDto[]> {
    const userId = user.sub;
    const users = await this.usersService.findAll(userId);
    return users.map((user) => new ResponseUserDto(user));
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.USERS.READ)
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ResponseUserDto> {
    const user = await this.usersService.findOne(id);
    return new ResponseUserDto(user);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.USERS.UPDATE, PERMISSIONS.USERS.SET_BUSINESS_UNITS)
  @SuccessMessage('Unidad de negocio del usuario actualizada correctamente')
  @Patch(':userId/business-units/:businessUnitId')
  async updateUserBusinessUnit(
    @Param('userId') userId: string,
    @Param('businessUnitId') businessUnitId: string,
    @Body() dto: UpdateUserBusinessUnitDto,
    @CurrentUser() actor: { id: string },
  ) {
    return await this.usersService.updateUserBusinessUnit(
      { userId, businessUnitId },
      dto,
      actor.id,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.USERS.UPDATE)
  @SuccessMessage('Usuario actualizado correctamente')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<ResponseUserDto> {
    const user = await this.usersService.update(id, updateUserDto);
    return new ResponseUserDto(user);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.USERS.DELETE)
  @SuccessMessage('Usuario eliminado correctamente')
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return await this.usersService.remove(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.USERS.CREATE, PERMISSIONS.USERS.SET_ROLES)
  @SuccessMessage('Usuario creado y asignado exitosamente')
  @Post('create-user-with-role-business')
  async createUserWithRoleAndUnit(
    @Body() dto: CreateUserWithRoleAndUnitDto,
  ): Promise<ResponseUserDto> {
    const user = await this.usersService.createUserWithRoleAndUnit(dto);
    return new ResponseUserDto(user);
  }

  /**
   * Asigna un usuario existente a una BU, con opción de copiar permisos desde un rol.
   * Requiere permiso (ej.) 'users.assign' en el contexto de la BU del header.
   */
  // @UseGuards(JwtAuthGuard, PermissionsGuard)
  // @Permissions(PERMISSIONS.USERS.ASSIGN, PERMISSIONS.ROLES.ASSIGN)
  // @Post('assign-to-business-unit')
  // @SuccessMessage('Usuario asignado a la unidad de negocio')
  // async assignToBusinessUnit(@Body() dto: AssignUserToBusinessUnitDto) {
  //   return this.usersService.assignToBusinessUnit(dto);
  // }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.USERS.CREATE)
  @SuccessMessage('Usuario creado')
  @Post()
  async createBasic(@Body() dto: CreateUserDto): Promise<ResponseUserDto> {
    const user = await this.usersService.createBasic(dto);
    return new ResponseUserDto(user);
  }
}
