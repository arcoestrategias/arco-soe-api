import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';

import {
  CreatePriorityDto,
  UpdatePriorityDto,
  FilterPriorityDto,
  ReorderPriorityWrapperDto,
  ToggleActivePriorityDto, // <- dto simple: { isActive: boolean }
  ResponsePriorityDto,
  CalculatePriorityIcpDto,
  ResponsePriorityIcpDto,
} from './dto';

import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/core/guards/permissions.guard';
import { Permissions } from 'src/core/decorators/permissions.decorator';
import { PERMISSIONS } from 'src/common/constants/permissions.constant';
import { SuccessMessage } from 'src/core/decorators/success-message.decorator';
import { UserId } from 'src/common/decorators/user-id.decorator';
import { PriorityService } from './priority.service';
import { GetIcpSeriesDto } from './dto/get-icp-series.dto';
import { IcpSeriesResponseDto } from './dto/icp-series-response.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('priorities')
export class PriorityController {
  constructor(private readonly priorityService: PriorityService) {}

  // CREATE
  @Permissions(PERMISSIONS.PRIORITIES.CREATE)
  @SuccessMessage('Prioridad creada correctamente')
  @Post()
  async createPriority(
    @Body() dto: CreatePriorityDto,
    @UserId() userId: string,
  ): Promise<ResponsePriorityDto> {
    return this.priorityService.create(dto, userId);
  }

  @Permissions(PERMISSIONS.PRIORITIES.READ)
  @SuccessMessage('Operación exitosa')
  @Get('icp/series')
  async icpSeries(@Query() q: GetIcpSeriesDto): Promise<IcpSeriesResponseDto> {
    return this.priorityService.icpSeries(q);
  }

  @Permissions(PERMISSIONS.PRIORITIES.READ)
  @SuccessMessage('ICP de prioridades calculado correctamente')
  @Get('icp')
  async calculateIcp(
    @Query() q: CalculatePriorityIcpDto,
  ): Promise<ResponsePriorityIcpDto> {
    return this.priorityService.calculateIcp(q);
  }

  // LIST
  @Permissions(PERMISSIONS.PRIORITIES.READ)
  @Get()
  async listPriorities(@Query() filters: FilterPriorityDto): Promise<{
    items: ResponsePriorityDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.priorityService.list(filters);
  }

  // DETAIL
  @Permissions(PERMISSIONS.PRIORITIES.READ)
  @Get(':id')
  async getPriorityById(
    @Param('id') priorityId: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ): Promise<ResponsePriorityDto> {
    const m = month ? Number(month) : undefined;
    const y = year ? Number(year) : undefined;
    return this.priorityService.findById(priorityId, { month: m, year: y });
  }

  // REORDER
  @Permissions(PERMISSIONS.PRIORITIES.UPDATE, PERMISSIONS.PRIORITIES.REORDER)
  @SuccessMessage('Orden de prioridades actualizado correctamente')
  @Patch('reorder')
  async reorderPriorities(
    @Body() wrapper: ReorderPriorityWrapperDto,
  ): Promise<ResponsePriorityDto[]> {
    await this.priorityService.reorder(wrapper.items);
    // si quieres devolver los elementos reordenados, llama al list con filtros previos;
    // aquí replico tu patrón: solo success message + 200.
    return [];
  }

  // UPDATE
  @Permissions(PERMISSIONS.PRIORITIES.UPDATE)
  @SuccessMessage('Prioridad actualizada correctamente')
  @Patch(':id')
  async updatePriority(
    @Param('id') priorityId: string,
    @Body() dto: UpdatePriorityDto,
    @UserId() userId: string,
  ): Promise<ResponsePriorityDto> {
    return this.priorityService.update(priorityId, dto, userId);
  }

  // TOGGLE ACTIVE / SOFT DELETE
  @Permissions(PERMISSIONS.PRIORITIES.UPDATE)
  @SuccessMessage('Estado de la prioridad actualizado correctamente')
  @Patch(':id/active')
  async togglePriorityActive(
    @Param('id') priorityId: string,
    @Body() dto: ToggleActivePriorityDto,
    @UserId() userId: string,
  ): Promise<ResponsePriorityDto> {
    return this.priorityService.toggleActive(priorityId, dto.isActive, userId);
  }
}
