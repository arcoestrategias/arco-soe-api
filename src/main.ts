// main.ts (producción) — Nest controla TODO: CORS, preflight, estáticos y validaciones
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

/**
 * Normaliza orígenes para comparaciones robustas:
 * - trim de espacios
 * - remueve barras finales
 * - fuerza minúsculas
 */
function norm(o?: string) {
  return (o ?? '').trim().replace(/\/+$/, '').toLowerCase();
}

async function bootstrap() {
  // Creamos la app. Desactivamos CORS implícito para manejarlo nosotros con enableCors y middleware.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: false,
  });

  // Prefijo global: toda la API cuelga de /api/v1
  app.setGlobalPrefix('api/v1');

  // Si corremos detrás de Nginx/Cloudflare, confiar en el proxy para leer X-Forwarded-*
  // @ts-ignore
  app.set('trust proxy', 1);

  // ====== Archivos estáticos (carpeta /public) ======
  // Sirve assets públicos (imágenes/pdf/etc.). Aquí damos CORS abierto (*) SOLO para recursos estáticos.
  // Si prefieres restringir por origen, cambia '*' por tu whitelist.
  app.useStaticAssets(join(__dirname, '..', 'public'), {
    setHeaders: (res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      // Cache agresivo para estáticos (1 año). Ajusta si necesitas invalidar más seguido.
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    },
  });

  // ====== Whitelist de orígenes desde ENV ======
  // Ejemplo:
  // CORS_ORIGINS=http://localhost:3000,https://qa.soe.la,https://qav2.soe.la,,https://portal.soe.la,https://portalv2.soe.la
  // (el doble “,,” se limpia con filter(Boolean))
  const rawOrigins = process.env.CORS_ORIGINS ?? '';
  const ALLOWED_ORIGINS = new Set(
    rawOrigins.split(',').map(norm).filter(Boolean),
  );
  console.log('[CORS] Allowed origins:', Array.from(ALLOWED_ORIGINS));

  // ====== Middleware CORS (Nest-only) ======
  // Objetivo:
  // 1) Inyectar ACAO en TODA respuesta real (2xx/4xx/5xx) si el Origin está permitido.
  //    Evita respuestas sin CORS cuando un filtro/interceptor devuelve error.
  // 2) Responder el preflight OPTIONS con 204 + headers esperados (siempre en Nest).
  app.use((req, res, next) => {
    const origin = (req.headers.origin as string | undefined) ?? '';
    const o = norm(origin);

    // Refleja el origen permitido (ACAO + credenciales). Vary: Origin evita problemas de caché compartida.
    if (origin && ALLOWED_ORIGINS.has(o)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    // Manejo del preflight (OPTIONS): el navegador lo envía cuando hay headers no simples (Authorization, etc.)
    if (req.method === 'OPTIONS') {
      res.setHeader(
        'Access-Control-Allow-Methods',
        'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS',
      );
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Authorization, Content-Type, Accept, X-Requested-With',
      );
      return res.status(204).send(); // 204 No Content: preflight correcto
    }

    next();
  });

  // ====== CORS oficial de Nest (regla “formal” de validación) ======
  // enableCors mantiene la whitelist; el middleware anterior asegura que TODA salida lleve CORS correcto.
  app.enableCors({
    origin: (origin, cb) => {
      // Permite herramientas sin header Origin (curl, healthchecks)
      if (!origin) return cb(null, true);
      return cb(null, ALLOWED_ORIGINS.has(norm(origin)));
    },
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    // Headers permitidos que puede enviar el cliente (incluye Authorization para Bearer)
    allowedHeaders: 'Authorization,Content-Type,Accept,X-Requested-With',
    // Headers visibles para el navegador en respuestas (útil para descargas)
    exposedHeaders: ['Content-Disposition'],
    // Si en el futuro usas cookies/sesiones cross-site, ya está listo.
    credentials: true,
  });

  // ====== Validaciones globales (producción) ======
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Elimina del payload propiedades NO definidas en los DTOs
      transform: true, // Convierte tipos hacia los del DTO (p.ej., string->number)
      forbidNonWhitelisted: false, // No lanza 400 por props extra (ya se limpian con whitelist)
    }),
  );

  // ====== Arranque del servidor ======
  const port = parseInt(process.env.PORT ?? '4000', 10);
  await app.listen(port, '0.0.0.0');
  console.log('[BOOT] API on', await app.getUrl());
}

bootstrap();
