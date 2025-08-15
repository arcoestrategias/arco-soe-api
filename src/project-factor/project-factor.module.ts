import { Module } from '@nestjs/common';
import { ProjectFactorService } from './project-factor.service';
import { ProjectFactorController } from './project-factor.controller';
import { ProjectFactorRepository } from './repositories/project-factor.repository';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [ProjectFactorController],
  providers: [ProjectFactorService, ProjectFactorRepository, PrismaService],
  exports: [ProjectFactorRepository],
})
export class ProjectFactorModule {}
