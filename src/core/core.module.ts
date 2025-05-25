import { Module, Global } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

// Interceptores globales
import { SuccessLoggerInterceptor } from './interceptors/success-logger.interceptor';
import { ResponseTransformInterceptor } from './interceptors/response-transform.interceptor';

// Filtro global de excepciones
import { AllExceptionsFilter } from './filters/all-exceptions.filter';

// Guards y servicios transversales
import { PermissionsGuard } from './guards/permissions.guard';
import { PermissionValidatorService } from './services/permission-validator.service';
import { WinstonLoggerService } from './services/winston-logger.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Global() // Este decorador hace que todo lo que exporte este módulo esté disponible globalmente en la app
@Module({
  providers: [
    WinstonLoggerService,
    PermissionValidatorService,
    PermissionsGuard,
    PrismaService,
    // Interceptor de logging de respuestas exitosas
    {
      provide: APP_INTERCEPTOR,
      useClass: SuccessLoggerInterceptor,
    },

    // Interceptor de transformación de respuesta (añade success, statusCode, message, data)
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseTransformInterceptor,
    },

    // Filtro global para manejar todas las excepciones
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
  exports: [WinstonLoggerService, PermissionValidatorService, PermissionsGuard],
})
export class CoreModule {}
