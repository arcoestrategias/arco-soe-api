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
    cors: false, // lo manejamos nosotros
  });

  app.setGlobalPrefix('api/v1');
  // @ts-ignore
  app.set('trust proxy', 1);

  // (Opcional) estáticos públicos con CORS abierto
  app.useStaticAssets(join(__dirname, '..', 'public'), {
    setHeaders: (res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    },
  });

  // ✅ Lista "hardcoded" de orígenes permitidos
  const ALLOWED_ORIGINS = new Set(
    ['https://qav2.soe.la', 'http://localhost:3000'].map(norm),
  );

  app.enableCors({
    origin: (origin, cb) => {
      // Permite SSR/health checks (no traen Origin)
      if (!origin) return cb(null, true);

      const o = norm(origin);
      if (ALLOWED_ORIGINS.has(o)) return cb(null, true);

      // ❌ No lanzar error: devolver false evita 500 en preflight
      return cb(null, false);
    },
    methods: 'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS',
    allowedHeaders: 'Authorization,Content-Type',
    credentials: true, // pon false si NO usas cookies/sesión
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const port = parseInt(process.env.PORT ?? '4000', 10);
  await app.listen(port, '0.0.0.0');

  console.log('[BOOT] API on', await app.getUrl());
}
bootstrap();
