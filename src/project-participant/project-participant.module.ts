import { Module } from '@nestjs/common';
import { ProjectParticipantService } from './project-participant.service';
import { ProjectParticipantController } from './project-participant.controller';
import { ProjectParticipantRepository } from './repositories/project-participant.repository';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [ProjectParticipantController],
  providers: [
    ProjectParticipantService,
    ProjectParticipantRepository,
    PrismaService,
  ],
  exports: [ProjectParticipantRepository],
})
export class ProjectParticipantModule {}
