import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';

function norm(o?: string) {
  return (o ?? '').trim().replace(/\/+$/, '').toLowerCase();
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Prefijo global para todos los endpoints: /api/v1/**
  app.setGlobalPrefix('api/v1');

  // Si corres detrás de Nginx/Proxy
  // @ts-ignore
  app.set('trust proxy', 1);

  // Seguridad base (CSP, XSS, etc.)
  app.use(
    helmet({
      // Permitimos que otros orígenes válidos consuman estáticos si corresponde
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // ========= CORS (solo orígenes explícitos por ENV) =========
  const ORIGINS = new Set(
    (process.env.CORS_ORIGINS ?? '').split(',').map(norm).filter(Boolean),
  );

  app.enableCors({
    origin: (origin, cb) => {
      // Permite herramientas sin header Origin (curl/postman)
      if (!origin) return cb(null, true);

      const o = norm(origin);
      if (ORIGINS.has(o)) return cb(null, true);

      return cb(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'Accept',
      'X-Requested-With',
    ],
    exposedHeaders: ['Content-Disposition'],
    credentials: true, // Permite cookies/credenciales si en el futuro las usas
  });

  // ========= Archivos estáticos (/uploads) con CORS y cache =========
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
    index: false,
    setHeaders: (res) => {
      const requestOrigin =
        (res.req.headers.origin as string | undefined) ?? '';
      const o = norm(requestOrigin);
      const isAllowed = !!requestOrigin && ORIGINS.has(o);

      if (isAllowed) {
        res.setHeader('Access-Control-Allow-Origin', requestOrigin);
        res.setHeader('Vary', 'Origin'); // Evita cache mixto por origen
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      }

      // Cache control (ajusta a tu necesidad)
      res.setHeader('Cache-Control', 'public, max-age=3600');
    },
  });

  // ========= Validaciones globales =========
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // Convierte payloads a instancias de DTO automáticamente
      whitelist: true, // Elimina del payload propiedades que NO existan en el DTO
      forbidNonWhitelisted: true, // Lanza 400 si llega una propiedad no permitida
      transformOptions: {
        enableImplicitConversion: true, // Permite conversiones de tipo implícitas (string->number, etc.)
      },
    }),
  );

  const port = parseInt(process.env.PORT ?? '3000', 10);
  await app.listen(port, '0.0.0.0');
  console.log(`[BOOT] API on ${await app.getUrl()}`);
}
bootstrap();
