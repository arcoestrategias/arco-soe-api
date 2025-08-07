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
} from '@nestjs/common';
import {
  CreateStrategicPlanDto,
  UpdateStrategicPlanDto,
  ResponseStrategicPlanDto,
} from './dto';
import { StrategicPlanService } from './strategic-plan.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/core/guards/permissions.guard';
import { Permissions } from 'src/core/decorators/permissions.decorator';
import { PERMISSIONS } from 'src/common/constants/permissions.constant';
import { SuccessMessage } from 'src/core/decorators/success-message.decorator';
import { UserId } from 'src/common/decorators/user-id.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('strategic-plans')
export class StrategicPlanController {
  constructor(private readonly planService: StrategicPlanService) {}

  @Permissions(PERMISSIONS.STRATEGIC_PLANS.CREATE)
  @SuccessMessage('Plan estratégico creado exitosamente')
  @Post()
  async create(
    @Body() dto: CreateStrategicPlanDto,
    @UserId() userId: string,
  ): Promise<ResponseStrategicPlanDto> {
    const plan = await this.planService.create(dto, userId);
    return new ResponseStrategicPlanDto(plan);
  }

  @Permissions(PERMISSIONS.STRATEGIC_PLANS.READ)
  @Get()
  async findAll(
    @Query('businessUnitId') businessUnitId: string,
  ): Promise<ResponseStrategicPlanDto[]> {
    const result = await this.planService.findAll(businessUnitId);
    return result.map((p) => new ResponseStrategicPlanDto(p));
  }

  @Permissions(PERMISSIONS.STRATEGIC_PLANS.READ)
  @Get(':id')
  async findById(@Param('id') id: string): Promise<ResponseStrategicPlanDto> {
    const plan = await this.planService.findById(id);
    return new ResponseStrategicPlanDto(plan);
  }

  @Permissions(PERMISSIONS.STRATEGIC_PLANS.UPDATE)
  @SuccessMessage('Plan estratégico actualizado correctamente')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateStrategicPlanDto,
    @UserId() userId: string,
  ): Promise<ResponseStrategicPlanDto> {
    const updated = await this.planService.update(id, dto, userId);
    return new ResponseStrategicPlanDto(updated);
  }

  @Permissions(PERMISSIONS.STRATEGIC_PLANS.DELETE)
  @SuccessMessage('Plan estratégico eliminado correctamente')
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @UserId() userId: string,
  ): Promise<void> {
    await this.planService.remove(id, userId);
  }
}
