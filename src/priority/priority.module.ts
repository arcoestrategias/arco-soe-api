import { Module } from '@nestjs/common';
import { PriorityService } from './priority.service';
import { PriorityController } from './priority.controller';
import { PriorityRepository } from './repositories/priority.repository';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [PriorityController],
  providers: [PriorityService, PriorityRepository, PrismaService],
  exports: [PriorityService],
})
export class PriorityModule {}
