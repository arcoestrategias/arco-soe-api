import { Module } from '@nestjs/common';
import { ProjectTaskService } from './project-task.service';
import { ProjectTaskController } from './project-task.controller';
import { ProjectTaskRepository } from './repositories/project-task.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { StrategicProjectModule } from 'src/strategic-project/strategic-project.module';
import { ProjectParticipantModule } from 'src/project-participant/project-participant.module';

@Module({
  controllers: [ProjectTaskController],
  providers: [ProjectTaskService, ProjectTaskRepository, PrismaService],
  imports: [StrategicProjectModule, ProjectParticipantModule],
})
export class ProjectTaskModule {}
