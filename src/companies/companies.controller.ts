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
}
