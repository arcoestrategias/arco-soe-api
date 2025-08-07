import { Module } from '@nestjs/common';
import { StrategicSuccessFactorsController } from './strategic-success-factor.controller';
import { StrategicSuccessFactorsService } from './strategic-success-factor.service';
import { StrategicSuccessFactorsRepository } from './repositories/strategic-success-factors.repository';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [StrategicSuccessFactorsController],
  providers: [
    StrategicSuccessFactorsService,
    StrategicSuccessFactorsRepository,
    PrismaService,
  ],
})
export class StrategicSuccessFactorModule {}
