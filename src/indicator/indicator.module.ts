import { Module } from '@nestjs/common';
import { IndicatorService } from './indicator.service';
import { IndicatorController } from './indicator.controller';
import { IndicatorRepository } from './repositories/indicator.repository';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [IndicatorController],
  providers: [IndicatorService, IndicatorRepository, PrismaService],
  exports: [IndicatorRepository],
})
export class IndicatorModule {}
