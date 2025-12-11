import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
  BadRequestException,
} from '@nestjs/common';
import {
  CreateStrategicValueDto,
  UpdateStrategicValueDto,
  ResponseStrategicValueDto,
  ReorderStrategicValueWrapperDto,
} from './dto';
import { StrategicValueService } from './strategic-value.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/core/guards/permissions.guard';
import { Permissions } from 'src/core/decorators/permissions.decorator';
import { PERMISSIONS } from 'src/common/constants/permissions.constant';
import { SuccessMessage } from 'src/core/decorators/success-message.decorator';
import { UserId } from 'src/common/decorators/user-id.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('strategic-values')
export class StrategicValueController {
  constructor(private readonly valueService: StrategicValueService) {}

  @Permissions(PERMISSIONS.STRATEGIC_VALUES.CREATE)
  @SuccessMessage('Valor creado exitosamente')
  @Post()
  async create(
    @Body() dto: CreateStrategicValueDto,
    @UserId() userId: string,
  ): Promise<ResponseStrategicValueDto> {
    const value = await this.valueService.create(dto, userId);
    return new ResponseStrategicValueDto(value);
  }

  @Permissions(PERMISSIONS.STRATEGIC_VALUES.READ)
  @Get()
  async findAll(
    @Query('strategicPlanId') strategicPlanId: string,
  ): Promise<ResponseStrategicValueDto[]> {
    if (!strategicPlanId) {
      throw new BadRequestException(
        'El parámetro strategicPlanId es requerido',
      );
    }
    const result = await this.valueService.findAll(strategicPlanId);
    return result.map((v) => new ResponseStrategicValueDto(v));
  }

  @Permissions(PERMISSIONS.STRATEGIC_VALUES.READ)
  @Get(':id')
  async findById(@Param('id') id: string): Promise<ResponseStrategicValueDto> {
    const value = await this.valueService.findById(id);
    return new ResponseStrategicValueDto(value);
  }

  @Permissions(
    PERMISSIONS.STRATEGIC_VALUES.UPDATE,
    PERMISSIONS.STRATEGIC_VALUES.REORDER,
  )
  @Patch('reorder')
  @SuccessMessage('Orden actualizado correctamente')
  async reorder(
    @Body() dto: ReorderStrategicValueWrapperDto,
    @UserId() userId: string,
  ): Promise<void> {
    await this.valueService.reorder(dto, userId);
  }

  @Permissions(PERMISSIONS.STRATEGIC_VALUES.UPDATE)
  @SuccessMessage('Valor actualizado correctamente')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateStrategicValueDto,
    @UserId() userId: string,
  ): Promise<ResponseStrategicValueDto> {
    const updated = await this.valueService.update(id, dto, userId);
    return new ResponseStrategicValueDto(updated);
  }

  @Permissions(PERMISSIONS.STRATEGIC_VALUES.DELETE)
  @SuccessMessage('Valor eliminado correctamente')
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @UserId() userId: string,
  ): Promise<void> {
    await this.valueService.remove(id, userId);
  }
}
