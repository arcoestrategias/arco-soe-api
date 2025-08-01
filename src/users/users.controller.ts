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
import { CreateUserDto, UpdateUserDto, ResponseUserDto } from './dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/core/guards/permissions.guard';
import { Permissions } from 'src/core/decorators/permissions.decorator';
import { PERMISSIONS } from 'src/common/constants/permissions.constant';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { CurrentUserPayload } from 'src/auth/interfaces/current-user.interface';
import { SuccessMessage } from 'src/core/decorators/success-message.decorator';
import { BusinessUnitId } from 'src/common/decorators/business-unit-id.decorator';
import { BusinessUnitsService } from 'src/business-unit/business-unit.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
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
    @BusinessUnitId() businessUnitId: string,
  ) {
    const userId = user.sub;
    const userEntity = await this.usersService.findOne(userId);

    if (!businessUnitId) {
      console.log(`sin unidad`);
      const units = await this.usersService.findUnitsForUser(userId);

      if (Array.isArray(units) && units.length > 1) {
        return {
          ...userEntity.toResponse(),
          needsBusinessUnit: true,
          businessUnits: units,
        };
      }

      // si solo tiene una unidad, continuamos con esa
      businessUnitId = units[0]?.id;
    }

    const permissions =
      await this.businessUnitService.getUserPermissionsByModule(
        businessUnitId,
        userId,
      );

    return {
      ...userEntity.toResponse(),
      permissions,
    };
  }

  @Permissions(PERMISSIONS.USERS.CREATE)
  @SuccessMessage('Usuario creado exitosamente')
  @Post()
  async create(@Body() createUserDto: CreateUserDto): Promise<ResponseUserDto> {
    const user = await this.usersService.create(createUserDto);
    return new ResponseUserDto(user);
  }

  @Permissions(PERMISSIONS.USERS.READ)
  @Get()
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ResponseUserDto[]> {
    const userId = user.sub;
    const users = await this.usersService.findAll(userId);
    return users.map((user) => new ResponseUserDto(user));
  }

  @Permissions(PERMISSIONS.USERS.READ)
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ResponseUserDto> {
    const user = await this.usersService.findOne(id);
    return new ResponseUserDto(user);
  }

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

  @Permissions(PERMISSIONS.USERS.DELETE)
  @SuccessMessage('Usuario eliminado correctamente')
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return await this.usersService.remove(id);
  }
}
