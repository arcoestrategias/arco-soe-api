// main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

function norm(o?: string) {
  return (o ?? '').trim().replace(/\/+$/, '').toLowerCase();
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: false, // lo manejamos con enableCors()
  });

  app.setGlobalPrefix('api/v1');
  // @ts-ignore
  app.set('trust proxy', 1);

  // --- Cargar whitelist desde ENV ---
  // Ejemplo:
  // CORS_ORIGINS=http://localhost:3000,https://qa.soe.la,https://qav2.soe.la,https://portal.soe.la,https://portalv2.soe.la
  const ALLOWED_ORIGINS = new Set(
    (process.env.CORS_ORIGINS ?? '').split(',').map(norm).filter(Boolean),
  );

  // --- CORTA-FUEGO: responder PRELIGHT OPTIONS antes de guards/interceptors ---
  app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
      const origin = (req.headers.origin as string | undefined) ?? '';
      const o = norm(origin);
      if (origin && ALLOWED_ORIGINS.has(o)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader(
          'Access-Control-Allow-Methods',
          'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS',
        );
        res.setHeader(
          'Access-Control-Allow-Headers',
          'Authorization, Content-Type, Accept, X-Requested-With',
        );
      }
      return res.status(204).send();
    }
    next();
  });

  // --- CORS estándar en Nest ---
  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // curl/postman
      const o = norm(origin);
      return cb(null, ALLOWED_ORIGINS.has(o));
    },
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'Accept',
      'X-Requested-With',
    ],
    exposedHeaders: ['Content-Disposition'],
    credentials: true,
  });

  // Estáticos (no afectan al login/CORS)
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
    index: false,
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    },
  });

  // Validaciones globales
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // elimina props no definidas en DTOs
      transform: true, // convierte payloads a tipos de los DTOs
      forbidNonWhitelisted: false, // no lanza 400 por props extra (como antes)
    }),
  );

  const port = parseInt(process.env.PORT ?? '4000', 10);
  await app.listen(port, '0.0.0.0');
  console.log('[BOOT] API on', await app.getUrl());
}
bootstrap();
