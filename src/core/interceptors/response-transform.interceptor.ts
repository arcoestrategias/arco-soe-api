import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';
import { Reflector } from '@nestjs/core';
import { SUCCESS_MESSAGE_KEY } from '../decorators/success-message.decorator';

@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const res = context.switchToHttp().getResponse<Response>();
    const handler = context.getHandler();

    const message =
      this.reflector.get<string>(SUCCESS_MESSAGE_KEY, handler) ||
      'Operación exitosa';

    return next.handle().pipe(
      map((data) => ({
        success: true,
        message,
        statusCode: res.statusCode,
        data,
      })),
    );
  }
}
