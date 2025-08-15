import { Module } from '@nestjs/common';
import { StrategicPlanService } from './strategic-plan.service';
import { StrategicPlanController } from './strategic-plan.controller';
import { StrategicPlanRepository } from './repositories/strategic-plan.repository';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [StrategicPlanController],
  providers: [StrategicPlanService, StrategicPlanRepository, PrismaService],
  exports: [StrategicPlanRepository]
})
export class StrategicPlanModule {}
