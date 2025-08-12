// src/ico/controllers/ico.controller.ts
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/core/guards/permissions.guard';
import { Permissions } from 'src/core/decorators/permissions.decorator';
import { PERMISSIONS } from 'src/common/constants/permissions.constant';
import { IcoService } from './ico.service';
import {
  GetMonthlyIcoDto,
  GetPositionObjectivesIcoSeriesDto,
  GetPositionObjectivesMonthlyIcoDto,
  GetPositionObjectivesStatusDto,
} from './dto';

@Controller('ico')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class IcoController {
  constructor(private readonly ico: IcoService) {}

  // 1) ICO del mes por Plan Estratégico
  @Get('strategic-plans/:strategicPlanId/monthly')
  @Permissions(PERMISSIONS.STRATEGIC_PLANS.READ)
  async getMonthlyIcoByStrategicPlan(
    @Param('strategicPlanId') strategicPlanId: string,
    @Query() query: GetMonthlyIcoDto,
  ) {
    return this.ico.computeMonthlyIcoForStrategicPlan(
      strategicPlanId,
      query.month,
      query.year,
      query.mode ?? 'all',
    );
  }

  // 2) Objetivos por posición con ICO y semáforo del mes
  @Get('positions/:positionId/objectives/monthly')
  @Permissions(PERMISSIONS.OBJECTIVES.READ)
  async listObjectivesMonthlyByPosition(
    @Param('positionId') positionId: string,
    @Query() query: GetPositionObjectivesMonthlyIcoDto,
  ) {
    return this.ico.listObjectivesWithMonthlyIcoByPosition(positionId, {
      month: query.month,
      year: query.year,
      search: query.search,
      mode: query.mode ?? 'all',
    });
  }

  // 3) Serie mensual de ICO por posición (todos los meses del rango)
  @Get('positions/:positionId/objectives/monthly-series')
  @Permissions(PERMISSIONS.OBJECTIVES.READ)
  async listObjectivesIcoSeriesByPosition(
    @Param('positionId') positionId: string,
    @Query() query: GetPositionObjectivesIcoSeriesDto,
  ) {
    return this.ico.listObjectivesIcoSeriesByPosition(positionId, {
      fromYear: query.fromYear,
      toYear: query.toYear,
      search: query.search,
      mode: query.mode ?? 'all',
    });
  }

  @Get('positions/:positionId/objectives/status')
  @Permissions(PERMISSIONS.OBJECTIVES.READ)
  async listObjectivesStatusByPosition(
    @Param('positionId') positionId: string,
    @Query() query: GetPositionObjectivesStatusDto,
  ) {
    return this.ico.listObjectivesStatusByPosition(positionId, {
      month: query.month,
      year: query.year,
      search: query.search,
    });
  }
}
