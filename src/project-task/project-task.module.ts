import { Module } from '@nestjs/common';
import { ProjectTaskService } from './project-task.service';
import { ProjectTaskController } from './project-task.controller';
import { ProjectTaskRepository } from './repositories/project-task.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { StrategicProjectModule } from 'src/strategic-project/strategic-project.module';
import { ExternalUserModule } from 'src/external-user/external-user.module';

@Module({
  controllers: [ProjectTaskController],
  providers: [ProjectTaskService, ProjectTaskRepository, PrismaService],
  imports: [StrategicProjectModule, ExternalUserModule],
})
export class ProjectTaskModule {}
