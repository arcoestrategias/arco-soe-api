import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { PositionModule } from 'src/position/position.module';
import { FilesModule } from 'src/files/files.module';
import { ReportsPrioritiesService } from './reports-priorities.service';
import { CommentsModule } from 'src/comments/comments.module';

@Module({
  imports: [PositionModule, FilesModule, CommentsModule],
  controllers: [ReportsController],
  providers: [ReportsService, ReportsPrioritiesService],
})
export class ReportsModule {}
