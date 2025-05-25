import { Module } from '@nestjs/common';
import { WinstonLoggerService } from '../../core/services/winston-logger.service';

@Module({
  providers: [WinstonLoggerService],
  exports: [WinstonLoggerService],
})
export class LoggerModule {}
