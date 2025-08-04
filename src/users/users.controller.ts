import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
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

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly businessUnitService: BusinessUnitsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(
    @CurrentUser() user: CurrentUserPayload,
    @BusinessUnitId() businessUnitId?: string,
  ) {
    const userId = user.sub;
    const userEntity = await this.usersService.findOne(userId);
    let currentBusinessUnit: { id: string; name: string } | null = null;

    if (!businessUnitId) {
      const units = await this.usersService.findUnitsForUser(userId);

      if (units.length > 1) {
        return {
          ...userEntity.toResponse(),
          needsBusinessUnit: true,
          businessUnits: units,
        };
      }

      businessUnitId = units[0].id;
      currentBusinessUnit = units[0];
    } else {
      currentBusinessUnit = await this.usersService.findBusinessUnitInfo(
        userId,
        businessUnitId,
      );
    }

    const permissions =
      await this.businessUnitService.getUserPermissionsByModule(
        businessUnitId,
        userId,
      );

    return {
      ...userEntity.toResponse(),
      currentBusinessUnit,
      permissions,
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
  @Permissions(PERMISSIONS.USERS.CREATE, PERMISSIONS.ROLES.ASSIGN)
  @SuccessMessage('Usuario creado y asignado exitosamente')
  @Post('assign')
  async createUserWithRoleAndUnit(
    @Body() dto: CreateUserWithRoleAndUnitDto,
  ): Promise<ResponseUserDto> {
    const user = await this.usersService.createUserWithRoleAndUnit(dto);
    return new ResponseUserDto(user);
  }
}
