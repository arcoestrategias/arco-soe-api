import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CreateExternalUserDto, UpdateExternalUserDto } from './dto';
import { ExternalUserEntity } from './entities/external-user.entity';
import { ExternalUserService } from './external-user.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/core/guards/permissions.guard';
import { Permissions } from 'src/core/decorators/permissions.decorator';
import { PERMISSIONS } from 'src/common/constants/permissions.constant';
import { SuccessMessage } from 'src/core/decorators/success-message.decorator';
import { UserId } from 'src/common/decorators/user-id.decorator';
import { CompanyId } from 'src/common/decorators/company-id.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('external-users')
export class ExternalUserController {
  constructor(private readonly service: ExternalUserService) {}

  @Permissions(PERMISSIONS.PROJECT_TASKS.CREATE)
  @SuccessMessage('Usuario externo creado correctamente')
  @Post()
  async create(
    @Body() dto: CreateExternalUserDto,
    @CompanyId() companyId: string,
    @UserId() userId: string,
  ): Promise<ExternalUserEntity> {
    return this.service.create(dto, companyId, userId);
  }

  @Permissions(PERMISSIONS.PROJECT_TASKS.READ)
  @Get()
  async list(
    @CompanyId() companyId: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<ExternalUserEntity[]> {
    const parsedIsActive =
      isActive === undefined ? undefined : isActive === 'true';
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedLimit = limit ? parseInt(limit, 10) : 50;

    const result = await this.service.list({
      companyId,
      isActive: parsedIsActive,
      page: parsedPage,
      limit: parsedLimit,
    });
    return result.items;
  }

  @Permissions(PERMISSIONS.PROJECT_TASKS.READ)
  @Get(':id')
  async findById(
    @Param('id') id: string,
    @CompanyId() companyId: string,
  ): Promise<ExternalUserEntity> {
    return this.service.findById(id, companyId);
  }

  @Permissions(PERMISSIONS.PROJECT_TASKS.READ)
  @Get('by-email/:email')
  async findByEmail(
    @Param('email') email: string,
    @CompanyId() companyId: string,
  ): Promise<ExternalUserEntity> {
    return this.service.findByEmail(email, companyId);
  }

  @Permissions(PERMISSIONS.PROJECT_TASKS.UPDATE)
  @SuccessMessage('Usuario externo actualizado correctamente')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateExternalUserDto,
    @CompanyId() companyId: string,
    @UserId() userId: string,
  ): Promise<ExternalUserEntity> {
    return this.service.update(id, dto, companyId, userId);
  }
}
