import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { WinstonLoggerService } from 'src/core/services/winston-logger.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: WinstonLoggerService) {}

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const responseBody = isHttp
      ? exception.getResponse()
      : { message: 'Error interno del servidor' };

    const message =
      typeof responseBody === 'string'
        ? responseBody
        : (responseBody as any)?.message || 'Error no especificado';

    const errorName = exception?.name || 'InternalServerError';

    this.logger.error(
      `[${request.method}] ${request.url} ${status} - ${message}`,
      'HttpExceptionFilter',
      exception.stack,
    );

    response.status(status).json({
      success: false,
      message,
      statusCode: status,
      error: errorName,
      path: request.url,
    });
  }
}
