import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { IndicatorService } from './indicator.service';
import {
  CreateIndicatorDto,
  UpdateIndicatorDto,
  ResponseIndicatorDto,
} from './dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/core/guards/permissions.guard';
import { Permissions } from 'src/core/decorators/permissions.decorator';
import { PERMISSIONS } from 'src/common/constants/permissions.constant';
import { UserId } from 'src/common/decorators/user-id.decorator';
import { SuccessMessage } from 'src/core/decorators/success-message.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('indicators')
export class IndicatorController {
  constructor(private readonly indicatorService: IndicatorService) {}

  @Permissions(PERMISSIONS.INDICATORS.CREATE)
  @SuccessMessage('Indicador creado exitosamente')
  @Post()
  async create(
    @Body() dto: CreateIndicatorDto,
    @UserId() userId: string,
  ): Promise<ResponseIndicatorDto> {
    const indicator = await this.indicatorService.create(dto, userId);
    return new ResponseIndicatorDto(indicator);
  }

  @Permissions(PERMISSIONS.INDICATORS.READ)
  @Get(':id')
  async findById(@Param('id') id: string): Promise<ResponseIndicatorDto> {
    const indicator = await this.indicatorService.findById(id);
    return new ResponseIndicatorDto(indicator);
  }

  @Permissions(PERMISSIONS.INDICATORS.UPDATE)
  @SuccessMessage('Indicador actualizado correctamente')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateIndicatorDto,
    @UserId() userId: string,
  ): Promise<ResponseIndicatorDto> {
    const updated = await this.indicatorService.update(id, dto, userId);
    return new ResponseIndicatorDto(updated);
  }

  @Permissions(PERMISSIONS.INDICATORS.DELETE)
  @SuccessMessage('Indicador eliminado correctamente')
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @UserId() userId: string,
  ): Promise<void> {
    await this.indicatorService.remove(id, userId);
  }
}
