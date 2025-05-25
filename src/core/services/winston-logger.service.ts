import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import { winstonConfig } from '../../common/logger/winston.config';

@Injectable()
export class WinstonLoggerService implements LoggerService {
  private readonly logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger(winstonConfig);
  }

  log(message: any, ...optionalParams: any[]) {
    this.logger.info(message, { context: optionalParams[0] });
  }

  error(message: any, ...optionalParams: any[]) {
    this.logger.error(message, {
      context: optionalParams[0],
      stack: optionalParams[1],
    });
  }

  warn(message: any, ...optionalParams: any[]) {
    this.logger.warn(message, { context: optionalParams[0] });
  }

  debug?(message: any, ...optionalParams: any[]) {
    this.logger.debug?.(message, { context: optionalParams[0] });
  }

  verbose?(message: any, ...optionalParams: any[]) {
    this.logger.verbose?.(message, { context: optionalParams[0] });
  }
}
