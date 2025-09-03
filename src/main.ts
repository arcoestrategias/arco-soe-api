import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

function parseList(env?: string): string[] {
  return (env ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Manejamos CORS nosotros mismos abajo
    cors: false,
  });

  // Prefijo global de API
  app.setGlobalPrefix('api/v1');

  // Si estás detrás de Nginx/Proxy
  // @ts-ignore
  app.set('trust proxy', 1);

  // Sirve estáticos (si los usas) con CORS abierto (sin credenciales)
  app.useStaticAssets(join(__dirname, '..', 'public'), {
    setHeaders: (res) => {
      res.setHeader('Access-Control-Allow-Origin', '*'); // permitido para assets públicos
      res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    },
  });

  // ---- CORS para API (estricto con lista blanca) ----
  const origins = parseList(process.env.CORS_ORIGINS);
  const allowedMethods =
    process.env.CORS_ALLOWED_METHODS ??
    'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS';
  const allowedHeaders =
    process.env.CORS_ALLOWED_HEADERS ?? 'Authorization,Content-Type';
  const allowCredentials =
    (process.env.CORS_ALLOW_CREDENTIALS ?? 'true').toLowerCase() === 'true';

  app.enableCors({
    origin: (origin, cb) => {
      // Permite SSR/health checks (sin header Origin) y orígenes listados
      if (!origin || origins.includes(origin)) return cb(null, true);
      return cb(new Error('CORS: origin not allowed'));
    },
    methods: allowedMethods,
    allowedHeaders: allowedHeaders,
    credentials: allowCredentials,
  });

  // Validaciones globales
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const port = parseInt(process.env.PORT ?? '4000', 10);
  await app.listen(port, '0.0.0.0');

  const startedOn = await app.getUrl();
  // eslint-disable-next-line no-console
  console.log(
    `[BOOT] API listening on ${startedOn}  |  Allowed CORS: ${origins.join(', ') || '(none)'}`,
  );
}
bootstrap();
