import { Module } from '@nestjs/common';
import { StrategicProjectService } from './strategic-project.service';
import { StrategicProjectController } from './strategic-project.controller';
import { StrategicProjectRepository } from './repositories/strategic-project.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { StrategicPlanModule } from 'src/strategic-plan/strategic-plan.module';
import { ProjectParticipantModule } from 'src/project-participant/project-participant.module';
import { ProjectFactorModule } from 'src/project-factor/project-factor.module';

@Module({
  controllers: [StrategicProjectController],
  providers: [
    StrategicProjectService,
    StrategicProjectRepository,
    PrismaService,
  ],
  imports: [StrategicPlanModule, ProjectFactorModule, ProjectParticipantModule],
  exports: [StrategicProjectRepository, StrategicProjectService],
})
export class StrategicProjectModule {}
