import { Module } from '@nestjs/common';
import { ObjectiveGoalService } from './objective-goal.service';
import { ObjectiveGoalController } from './objective-goal.controller';
import { ObjectiveGoalRepository } from './repositories/objective-goal.repository';
import { ObjectiveGoalMeasurementService } from './objective-goal-measurement.service';
import { ObjectiveGoalMeasurementRepository } from './repositories/objective-goal-measurement.repository';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [ObjectiveGoalController],
  providers: [
    ObjectiveGoalService,
    ObjectiveGoalRepository,
    ObjectiveGoalMeasurementService,
    ObjectiveGoalMeasurementRepository,
    PrismaService,
  ],
  exports: [
    ObjectiveGoalRepository,
    ObjectiveGoalService,
    ObjectiveGoalMeasurementService,
  ],
})
export class ObjectiveGoalModule {}
