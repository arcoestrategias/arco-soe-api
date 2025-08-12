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

  @Permissions(PERMISSIONS.OBJECTIVES.READ)
  @Get()
  async findAll(
    @Query('strategicPlanId') strategicPlanId: string,
  ): Promise<ResponseObjectiveDto[]> {
    if (!strategicPlanId) {
      throw new BadRequestException(
        'El parámetro strategicPlanId es requerido',
      );
    }
    const result = await this.objectiveService.findAll(strategicPlanId);
    return result.map((o) => new ResponseObjectiveDto(o));
  }

  @Permissions(PERMISSIONS.OBJECTIVES.READ)
  @Get(':id')
  async findById(@Param('id') id: string): Promise<ResponseObjectiveDto> {
    const objective = await this.objectiveService.findById(id);
    return new ResponseObjectiveDto(objective);
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
