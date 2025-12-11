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
import { ObjectiveGoalService } from './objective-goal.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/core/guards/permissions.guard';
import { Permissions } from 'src/core/decorators/permissions.decorator';
import { PERMISSIONS } from 'src/common/constants/permissions.constant';
import { SuccessMessage } from 'src/core/decorators/success-message.decorator';
import { UserId } from 'src/common/decorators/user-id.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('objective-goals')
export class ObjectiveGoalController {
  constructor(private readonly goalService: ObjectiveGoalService) {}

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

  @Permissions(
    PERMISSIONS.OBJECTIVES.UPDATE,
    PERMISSIONS.OBJECTIVE_GOALS.UPDATE,
  )
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
}
