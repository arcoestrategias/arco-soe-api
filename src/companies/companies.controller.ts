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
import { CreateCompanyDto, UpdateCompanyDto } from './dto';
import { ResponseCompanyDto } from './dto/response-company.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/core/guards/permissions.guard';
import { Permissions } from 'src/core/decorators/permissions.decorator';
import { PERMISSIONS } from 'src/common/constants/permissions.constant';
import { SuccessMessage } from 'src/core/decorators/success-message.decorator';
import { CompaniesService } from './companies.service';
import { UserId } from 'src/common/decorators/user-id.decorator';
import { ResponseGroupedUsersByUnitDto, ResponseUserDto } from 'src/users/dto';
import { GroupedUsersByUnitEntity } from 'src/users/entities/grouped-users-by-unit.entity';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companyService: CompaniesService) {}

  @Permissions(PERMISSIONS.COMPANIES.CREATE)
  @SuccessMessage('Empresa creada exitosamente')
  @Post()
  async create(
    @Body() dto: CreateCompanyDto,
    @UserId() UserId: string,
  ): Promise<ResponseCompanyDto> {
    const company = await this.companyService.create(dto, UserId);
    return new ResponseCompanyDto(company);
  }

  @Permissions(PERMISSIONS.COMPANIES.READ)
  @Get()
  async findAll(): Promise<ResponseCompanyDto[]> {
    const companies = await this.companyService.findAll();
    return companies.map((c) => new ResponseCompanyDto(c));
  }

  @Permissions(PERMISSIONS.COMPANIES.READ)
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ResponseCompanyDto> {
    const company = await this.companyService.findById(id);
    return new ResponseCompanyDto(company);
  }

  @Permissions(PERMISSIONS.COMPANIES.UPDATE)
  @SuccessMessage('Empresa actualizada correctamente')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDto,
    @UserId() UserId: string,
  ): Promise<ResponseCompanyDto> {
    const company = await this.companyService.update(id, dto, UserId);
    return new ResponseCompanyDto(company);
  }

  @Permissions(PERMISSIONS.COMPANIES.DELETE)
  @SuccessMessage('Empresa eliminada correctamente')
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @UserId() UserId: string,
  ): Promise<void> {
    await this.companyService.remove(id, UserId);
  }

  @Permissions(PERMISSIONS.USERS.READ)
  @Get(':companyId/users')
  async findUsersByCompany(
    @Param('companyId') companyId: string,
  ): Promise<ResponseUserDto[]> {
    const users = await this.companyService.findUsersByCompany(companyId);
    return users.map((u) => new ResponseUserDto(u));
  }

  @Permissions(PERMISSIONS.USERS.READ)
  @Get(':companyId/users/by-business-unit')
  async findUsersGroupedByBusinessUnit(
    @Param('companyId') companyId: string,
  ): Promise<ResponseGroupedUsersByUnitDto[]> {
    const result: GroupedUsersByUnitEntity[] =
      await this.companyService.findUsersGroupedByBusinessUnit(companyId);

    return result.map((unit) => ({
      businessUnitId: unit.businessUnitId,
      businessUnitName: unit.businessUnitName,
      roles: unit.roles.map((r) => ({
        roleId: r.roleId,
        roleName: r.roleName,
        users: r.users.map((u) => ({
          id: u.id,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          positionId: u.positionId,
          positionName: u.positionName,
        })),
      })),
    }));
  }

  /*
  Crea:
    Empresa (Company)
    Usuario inicial con correo ide@empresa.com
    Relación UserCompany como isManager
    Unidad principal (BusinessUnit)
    Posición CEO con isCeo = true
    Relación UserBusinessUnit con rol Manager y posición CEO
    Copia de permisos de RolePermission → UserPermission
  */
  @Permissions(PERMISSIONS.COMPANIES.CREATE)
  @SuccessMessage('Empresa creada con estructura inicial')
  @Post('full-create')
  async createWithStructure(
    @Body() dto: CreateCompanyDto,
  ): Promise<ResponseCompanyDto> {
    const company = await this.companyService.createWithStructure(dto);
    return new ResponseCompanyDto(company);
  }
}
