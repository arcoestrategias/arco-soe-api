import { Module } from '@nestjs/common';
import { PositionsController } from './position.controller';
import { PositionsService } from './position.service';
import { PositionsRepository } from './repositories/positions.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { PriorityModule } from 'src/priority/priority.module';
import { IcoModule } from 'src/ico/ico.module';
import { StrategicProjectModule } from 'src/strategic-project/strategic-project.module';

@Module({
  imports: [
    PriorityModule, // debe exportar PriorityService
    IcoModule, // debe exportar IcoService
    StrategicProjectModule, // debe exportar StrategicProjectService
  ],
  controllers: [PositionsController],
  providers: [PositionsService, PositionsRepository, PrismaService],
  exports: [PositionsService, PositionsRepository],
})
export class PositionModule {}
