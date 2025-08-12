import { Module } from '@nestjs/common';
import { ObjectiveService } from './objective.service';
import { ObjectiveController } from './objective.controller';
import { ObjectiveRepository } from './repositories/objective.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { IndicatorModule } from 'src/indicator/indicator.module';
import { ObjectiveGoalModule } from 'src/objective-goal/objective-goal.module';

@Module({
  imports: [IndicatorModule, ObjectiveGoalModule],
  controllers: [ObjectiveController],
  providers: [ObjectiveService, ObjectiveRepository, PrismaService],
})
export class ObjectiveModule {}
