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
    cors: false, // seguimos manejando nosotros con enableCors
  });

  app.setGlobalPrefix('api/v1');
  // @ts-ignore
  app.set('trust proxy', 1);

  // (Opcional) estáticos (no afecta CORS del login)
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
    index: false,
    setHeaders: (res) => {
      res.setHeader('Access-Control-Allow-Origin', '*'); // o limita a tus orígenes
      res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Cache-Control', 'public, max-age=3600');
    },
  });

  // ✅ Misma whitelist hardcoded que ya te funciona
  const ALLOWED_ORIGINS = new Set(
    ['https://qav2.soe.la', 'http://localhost:3000'].map(norm),
  );

  // 🔹 Middleware Nest-only para asegurar CORS en TODAS las respuestas
  app.use((req, res, next) => {
    const origin = (req.headers.origin as string | undefined) ?? '';
    const o = norm(origin);

    // Refleja ACAO solo si el origen está permitido por tu lista
    if (origin && ALLOWED_ORIGINS.has(o)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    // Maneja el preflight aquí mismo (Nest-only)
    if (req.method === 'OPTIONS') {
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

  // ✅ Tu enableCors de siempre (Nest controla CORS)
  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // curl/postman/health
      const o = norm(origin);
      return cb(null, ALLOWED_ORIGINS.has(o));
    },
    methods: 'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS',
    allowedHeaders: 'Authorization,Content-Type,Accept,X-Requested-With',
    exposedHeaders: ['Content-Disposition'],
    credentials: true,
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
