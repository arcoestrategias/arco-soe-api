// Este archivo extiende la interfaz Request de Express para permitir propiedades personalizadas
// Útil para autenticación, autorización, multi-tenant y auditoría

import { UserEntity } from 'src/users/entities/user.entity';

declare global {
  namespace Express {
    interface Request {
      // El usuario autenticado, inyectado por el guard
      user?: Partial<UserEntity> & {
        id?: string;
        email?: string;
        roles?: string[];
        permissions?: string[];
      };

      // ID del tenant si usas multi-tenant
      tenantId?: string;

      // Información del dispositivo (si usas device detection)
      device?: {
        type?: string; // 'desktop' | 'mobile' | 'tablet' | etc.
        os?: string;
        browser?: string;
        userAgent?: string;
      };

      // IP y origen para trazabilidad (ya existen en Express, pero puedes tiparlos explícitamente)
      ip?: string;
      originalUrl?: string;
    }
  }
}
