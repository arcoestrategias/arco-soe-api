import { Module } from '@nestjs/common';
import { PositionsController } from './position.controller';
import { PositionsService } from './position.service';
import { PositionsRepository } from './repositories/positions.repository';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [PositionsController],
  providers: [PositionsService, PositionsRepository, PrismaService],
  exports: [PositionsService, PositionsRepository],
})
export class PositionModule {}
