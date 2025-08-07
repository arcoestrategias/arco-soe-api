import { Module } from '@nestjs/common';
import { StrategicValueService } from './strategic-value.service';
import { StrategicValueController } from './strategic-value.controller';
import { StrategicValueRepository } from './repositories/strategic-value.repository';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [StrategicValueController],
  providers: [StrategicValueService, StrategicValueRepository, PrismaService],
})
export class StrategicValueModule {}
