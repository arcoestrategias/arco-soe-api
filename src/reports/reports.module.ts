import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { PositionModule } from 'src/position/position.module';
import { FilesModule } from 'src/files/files.module';

@Module({
  imports: [PositionModule, FilesModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
