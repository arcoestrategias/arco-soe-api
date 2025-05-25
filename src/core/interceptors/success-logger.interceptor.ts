import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';
import { WinstonLoggerService } from '../services/winston-logger.service';

@Injectable()
export class SuccessLoggerInterceptor implements NestInterceptor {
  constructor(private readonly logger: WinstonLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<Request>();
    const method = req.method;
    const url = req.originalUrl;
    const ip = req.ip;
    const tenantId = req.tenantId || 'N/A';
    const device = req.device?.type || 'unknown';
    const os = req.device?.os || 'unknown';
    const browser = req.device?.browser || 'unknown';

    //Excluir rutas
    const excludedPaths = ['/api/v1/uploads', '/api/v1/health'];
    if (excludedPaths.includes(url)) return next.handle();

    const user = req.user?.email || req.user?.id || 'Ruta pública / Anónimo';

    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        this.logger.log(
          `[${method}] ${url} - 200 OK - IP: ${ip} - Tenant: ${tenantId} - Device: ${device} (${os}, ${browser}) - Usuario: ${user} - ${duration}ms`,
          'SuccessLogger',
        );
      }),
    );
  }
}
