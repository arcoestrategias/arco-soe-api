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
    cors: false, // lo manejamos con enableCors
  });

  app.setGlobalPrefix('api/v1');
  // @ts-ignore
  app.set('trust proxy', 1);

  // --- 3) ORÍGENES PERMITIDOS DESDE ENV ---
  const norm = (o?: string) =>
    (o ?? '').trim().replace(/\/+$/, '').toLowerCase();
  const ALLOWED_ORIGINS = new Set(
    (process.env.CORS_ORIGINS ?? '').split(',').map(norm).filter(Boolean),
  );

  // --- 4) MIDDLEWARE GLOBAL: ACAO en TODAS las respuestas reales ---
  app.use((req, res, next) => {
    const origin = (req.headers.origin as string | undefined) ?? '';
    const o = norm(origin);
    if (origin && ALLOWED_ORIGINS.has(o)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    next();
  });

  // --- 5) MIDDLEWARE PRE-FLIGHT: responder OPTIONS con 204 ---
  app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
      const origin = (req.headers.origin as string | undefined) ?? '';
      if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
      }
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader(
        'Access-Control-Allow-Methods',
        'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS',
      );
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Authorization, Content-Type, Accept, X-Requested-With',
      );
      return res.status(204).send();
    }
    next();
  });

  // --- 6) CORS estándar en Nest (sigue validando orígenes) ---
  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // curl/postman
      return cb(null, ALLOWED_ORIGINS.has(norm(origin)));
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

  // (si tienes estáticos, déjalos aquí o antes; no afecta CORS del login)

  // --- luego tus pipes globales ---
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // elimina props no definidas en DTOs
      transform: true, // convierte payloads a tipos de los DTOs
      forbidNonWhitelisted: false, // no lanza 400 por props extra
    }),
  );

  const port = parseInt(process.env.PORT ?? '4000', 10);
  await app.listen(port, '0.0.0.0');
  console.log('[BOOT] API on', await app.getUrl());
}
bootstrap();
