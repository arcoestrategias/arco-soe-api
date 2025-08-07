import { Module } from '@nestjs/common';
import { ObjectiveGoalService } from './objective-goal.service';
import { ObjectiveGoalController } from './objective-goal.controller';
import { ObjectiveGoalRepository } from './repositories/objective-goal.repository';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [ObjectiveGoalController],
  providers: [ObjectiveGoalService, ObjectiveGoalRepository, PrismaService],
})
export class ObjectiveGoalModule {}
