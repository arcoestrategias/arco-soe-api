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
  CreateStrategicSuccessFactorDto,
  UpdateStrategicSuccessFactorDto,
  ResponseStrategicSuccessFactorDto,
  ReorderStrategicSuccessFactorWrapperDto,
} from './dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/core/guards/permissions.guard';
import { Permissions } from 'src/core/decorators/permissions.decorator';
import { PERMISSIONS } from 'src/common/constants/permissions.constant';
import { SuccessMessage } from 'src/core/decorators/success-message.decorator';
import { UserId } from 'src/common/decorators/user-id.decorator';
import { StrategicSuccessFactorsService } from './strategic-success-factor.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('strategic-success-factors')
export class StrategicSuccessFactorsController {
  constructor(private readonly factorService: StrategicSuccessFactorsService) {}

  @Permissions(PERMISSIONS.STRATEGIC_SUCCESS_FACTORS.CREATE)
  @SuccessMessage('Factor creado exitosamente')
  @Post()
  async create(
    @Body() dto: CreateStrategicSuccessFactorDto,
    @UserId() userId: string,
  ): Promise<ResponseStrategicSuccessFactorDto> {
    const factor = await this.factorService.create(dto, userId);
    return new ResponseStrategicSuccessFactorDto(factor);
  }

  @Permissions(PERMISSIONS.STRATEGIC_SUCCESS_FACTORS.READ)
  @Get()
  async findAll(
    @Query('strategicPlanId') strategicPlanId: string,
  ): Promise<ResponseStrategicSuccessFactorDto[]> {
    if (!strategicPlanId) {
      throw new BadRequestException(
        'El parámetro strategicPlanId es requerido',
      );
    }
    const result = await this.factorService.findAll(strategicPlanId);
    return result.map((f) => new ResponseStrategicSuccessFactorDto(f));
  }

  @Permissions(PERMISSIONS.STRATEGIC_SUCCESS_FACTORS.READ)
  @Get(':id')
  async findById(
    @Param('id') id: string,
  ): Promise<ResponseStrategicSuccessFactorDto> {
    const factor = await this.factorService.findById(id);
    return new ResponseStrategicSuccessFactorDto(factor);
  }

  @Permissions(
    PERMISSIONS.STRATEGIC_SUCCESS_FACTORS.UPDATE,
    PERMISSIONS.STRATEGIC_SUCCESS_FACTORS.REORDER,
  )
  @Patch('reorder')
  @SuccessMessage('Orden actualizado correctamente')
  async reorder(
    @Body() dto: ReorderStrategicSuccessFactorWrapperDto,
    @UserId() userId: string,
  ): Promise<void> {
    await this.factorService.reorder(dto, userId);
  }

  @Permissions(PERMISSIONS.STRATEGIC_SUCCESS_FACTORS.UPDATE)
  @SuccessMessage('Factor actualizado correctamente')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateStrategicSuccessFactorDto,
    @UserId() userId: string,
  ): Promise<ResponseStrategicSuccessFactorDto> {
    const updated = await this.factorService.update(id, dto, userId);
    return new ResponseStrategicSuccessFactorDto(updated);
  }

  @Permissions(PERMISSIONS.STRATEGIC_SUCCESS_FACTORS.DELETE)
  @SuccessMessage('Factor eliminado correctamente')
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @UserId() userId: string,
  ): Promise<void> {
    await this.factorService.remove(id, userId);
  }
}
