import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { PositionModule } from 'src/position/position.module';
import { FilesModule } from 'src/files/files.module';
import { ReportsPrioritiesService } from './reports-priorities.service';
import { CommentsModule } from 'src/comments/comments.module';
import { BusinessUnitsRepository } from 'src/business-unit/repositories/business-units.repository';
import { BusinessUnitsModule } from 'src/business-unit/business-unit.module';
import { StrategicProjectModule } from 'src/strategic-project/strategic-project.module';
import { ReportsStrategicProjectsService } from './reports-strategic-projects.service';

@Module({
  imports: [
    PositionModule,
    FilesModule,
    CommentsModule,
    BusinessUnitsModule,
    StrategicProjectModule,
  ],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    ReportsPrioritiesService,
    ReportsStrategicProjectsService,
  ],
})
export class ReportsModule {}
