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
  Req,
} from '@nestjs/common';
import {
  CreateObjectiveDto,
  UpdateObjectiveDto,
  ResponseObjectiveDto,
  ReorderObjectiveWrapperDto,
  ConfigureObjectiveDto,
  ResponseConfigureObjectiveDto,
} from './dto';
import { ObjectiveService } from './objective.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/core/guards/permissions.guard';
import { Permissions } from 'src/core/decorators/permissions.decorator';
import { PERMISSIONS } from 'src/common/constants/permissions.constant';
import { SuccessMessage } from 'src/core/decorators/success-message.decorator';
import { UserId } from 'src/common/decorators/user-id.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('objectives')
export class ObjectiveController {
  constructor(private readonly objectiveService: ObjectiveService) {}

  @Permissions(PERMISSIONS.OBJECTIVES.CREATE)
  @SuccessMessage('Objetivo creado exitosamente')
  @Post()
  async create(
    @Body() dto: CreateObjectiveDto,
    @UserId() userId: string,
  ): Promise<ResponseObjectiveDto> {
    const objective = await this.objectiveService.create(dto, userId);
    return new ResponseObjectiveDto(objective);
  }

  /**
   * Devuelve los objetivos cuyo indicador NO está configurado
   * para un strategicPlanId y un positionId específicos.
   * GET /objectives/unconfigured?strategicPlanId=...&positionId=...
   */
  @Get('unconfigured')
  @Permissions(PERMISSIONS.OBJECTIVES.READ)
  @SuccessMessage('Lista de objetivos no configurados') // opcional
  async listUnconfigured(
    @Query('strategicPlanId') strategicPlanId: string,
    @Query('positionId') positionId: string,
  ) {
    const rows = await this.objectiveService.findUnconfiguredByPlanAndPosition(
      strategicPlanId,
      positionId,
    );
    return rows; // tu interceptor de response se encarga del envelope
  }

  @Permissions(PERMISSIONS.OBJECTIVES.READ)
  @Get()
  async findAll(
    @Query('strategicPlanId') strategicPlanId: string,
    @Query('positionId') positionId: string,
  ): Promise<ResponseObjectiveDto[]> {
    if (!strategicPlanId) {
      throw new BadRequestException(
        'El parámetro strategicPlanId es requerido',
      );
    }

    if (!positionId) {
      throw new BadRequestException('El parámetro positionId es requerido');
    }
    const result = await this.objectiveService.findAll(
      strategicPlanId,
      positionId,
    );
    return result.map((o) => new ResponseObjectiveDto(o));
  }

  @Permissions(PERMISSIONS.OBJECTIVES.READ)
  @Get(':id')
  async findById(@Param('id') id: string): Promise<ResponseObjectiveDto> {
    const objective = await this.objectiveService.findById(id);
    return new ResponseObjectiveDto(objective);
  }

  @Patch(':id/inactivate')
  @Permissions(PERMISSIONS.OBJECTIVES.DELETE)
  async inactivate(@Param('id') id: string, @UserId() userId: string) {
    // devolvemos un body con blocked/message/associations (200 siempre)
    return await this.objectiveService.inactivate(id, userId);
  }

  @Permissions(PERMISSIONS.OBJECTIVES.UPDATE)
  @SuccessMessage('Objetivo configurado correctamente')
  @Patch(':id/configure')
  async configure(
    @Param('id') id: string,
    @Body() body: ConfigureObjectiveDto,
    @UserId() userId: string,
  ) {
    const payload: ConfigureObjectiveDto = { ...body, objectiveId: id };
    const result = await this.objectiveService.configureObjective(
      payload,
      userId,
    );
    return new ResponseConfigureObjectiveDto(result);
  }

  @Permissions(PERMISSIONS.OBJECTIVES.UPDATE)
  @SuccessMessage('Orden actualizado correctamente')
  @Patch('reorder')
  async reorder(
    @Body() dto: ReorderObjectiveWrapperDto,
    @UserId() userId: string,
  ): Promise<void> {
    await this.objectiveService.reorder(dto, userId);
  }

  @Permissions(PERMISSIONS.OBJECTIVES.UPDATE)
  @SuccessMessage('Objetivo actualizado correctamente')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateObjectiveDto,
    @UserId() userId: string,
  ): Promise<ResponseObjectiveDto> {
    const updated = await this.objectiveService.update(id, dto, userId);
    return new ResponseObjectiveDto(updated);
  }

  @Permissions(PERMISSIONS.OBJECTIVES.DELETE)
  @SuccessMessage('Objetivo eliminado correctamente')
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @UserId() userId: string,
  ): Promise<void> {
    await this.objectiveService.remove(id, userId);
  }
}
