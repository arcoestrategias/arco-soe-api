import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateObjectiveGoalDto,
  UpdateObjectiveGoalDto,
  ResponseObjectiveGoalDto,
} from './dto';
import { SaveMeasurementsBatchDto } from './dto/measurement.dto';
import { UpdateMeasurementCountDto } from './dto/measurement-count.dto';
import { ObjectiveGoalService } from './objective-goal.service';
import { ObjectiveGoalMeasurementService } from './objective-goal-measurement.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/core/guards/permissions.guard';
import { Permissions } from 'src/core/decorators/permissions.decorator';
import { PERMISSIONS } from 'src/common/constants/permissions.constant';
import { SuccessMessage } from 'src/core/decorators/success-message.decorator';
import { UserId } from 'src/common/decorators/user-id.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('objective-goals')
export class ObjectiveGoalController {
  constructor(
    private readonly goalService: ObjectiveGoalService,
    private readonly measurementService: ObjectiveGoalMeasurementService,
  ) {}

  @Permissions(PERMISSIONS.OBJECTIVES.CREATE)
  @SuccessMessage('Cumplimiento creado correctamente')
  @Post()
  async create(
    @Body() dto: CreateObjectiveGoalDto,
    @UserId() userId: string,
  ): Promise<ResponseObjectiveGoalDto> {
    const goal = await this.goalService.create(dto, userId);
    return new ResponseObjectiveGoalDto(goal);
  }

  @Permissions(PERMISSIONS.OBJECTIVES.READ)
  @Get(':id')
  async findById(@Param('id') id: string): Promise<ResponseObjectiveGoalDto> {
    const goal = await this.goalService.findById(id);
    if (!goal) {
      throw new NotFoundException('Cumplimiento no encontrado');
    }
    return new ResponseObjectiveGoalDto(goal);
  }

  @Permissions(PERMISSIONS.OBJECTIVE_GOALS.UPDATE)
  @SuccessMessage('Cumplimiento actualizado correctamente')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateObjectiveGoalDto,
    @UserId() userId: string,
  ): Promise<ResponseObjectiveGoalDto> {
    const updated = await this.goalService.update(id, dto, userId);
    return new ResponseObjectiveGoalDto(updated);
  }

  @Permissions(PERMISSIONS.OBJECTIVES.DELETE)
  @SuccessMessage('Cumplimiento eliminado correctamente')
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @UserId() userId: string,
  ): Promise<void> {
    await this.goalService.remove(id, userId);
  }

  // ---- Measurements (mediciones internas) ----

  @Permissions(PERMISSIONS.OBJECTIVES.READ)
  @Get(':id/measurements')
  async getMeasurements(
    @Param('id') id: string,
  ) {
    return this.measurementService.findByGoalId(id);
  }

  @Permissions(PERMISSIONS.OBJECTIVE_GOALS.UPDATE)
  @SuccessMessage('Mediciones guardadas correctamente')
  @Post(':id/measurements')
  async saveMeasurements(
    @Param('id') id: string,
    @Body() dto: SaveMeasurementsBatchDto,
    @UserId() userId: string,
  ) {
    return this.measurementService.saveBatch(id, dto.measurements, userId);
  }

  @Permissions(PERMISSIONS.OBJECTIVE_GOALS.UPDATE)
  @SuccessMessage('Cantidad de mediciones actualizada')
  @Patch(':id/measurement-count')
  async updateMeasurementCount(
    @Param('id') id: string,
    @Body() dto: UpdateMeasurementCountDto,
    @UserId() userId: string,
  ) {
    await this.measurementService.updateMeasurementCount(
      id, dto.measurementCount, dto.applyToFuture, userId,
    );
    return { success: true };
  }

  @Permissions(PERMISSIONS.OBJECTIVES.DELETE)
  @SuccessMessage('Medición eliminada correctamente')
  @Delete('measurements/:measurementId')
  async deleteMeasurement(
    @Param('measurementId') measurementId: string,
    @UserId() userId: string,
  ) {
    await this.measurementService.delete(measurementId, userId);
    return { success: true };
  }
}
