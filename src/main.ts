import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

/**
 * Normaliza orígenes para comparación:
 * - trim espacios
 * - quita barras finales
 * - lowercase
 * Evita falsos negativos al comparar Origins.
 */
function norm(o?: string) {
  return (o ?? '').trim().replace(/\/+$/, '').toLowerCase();
}

async function bootstrap() {
  /**
   * Creamos la app desactivando el CORS automático de Nest
   * porque CORS lo controlamos explícitamente con enableCors()
   * y un middleware (ver más abajo).
   */
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: false, // seguimos manejando nosotros con enableCors
  });

  /**
   * Prefijo global: todas las rutas quedan bajo /api/v1
   * Estandariza los endpoints y facilita el versionado.
   */
  app.setGlobalPrefix('api/v1');

  /**
   * Si estamos detrás de Nginx/Cloudflare, confía en el proxy para X-Forwarded-*
   * Necesario para obtener IP/PROTO reales en logs, cookies seguras, etc.
   */
  // @ts-ignore
  app.set('trust proxy', 1);

  /**
   * Servir archivos estáticos desde /uploads
   * - prefix '/uploads/' para URLs limpias
   * - CORS abierto (*) solo para estos recursos
   * - cache moderado (1 hora)
   * Nota: esto NO afecta CORS de la API /auth/login.
   */
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

  /**
   * Whitelist de orígenes PERMITIDOS para la API (hardcoded).
   * Si quieres parametrizar en el futuro: leer de process.env.CORS_ORIGINS.
   */
  const ALLOWED_ORIGINS = new Set(
    ['https://qav2.soe.la', 'http://localhost:3000'].map(norm),
  );

  /**
   * Middleware CORS (Nest-only) para robustecer:
   * - Inyecta ACAO/credenciales en TODA respuesta real si el Origin está permitido.
   * - Responde el preflight OPTIONS con 204 y los headers esperados.
   * Esto evita que algún interceptor/filtro deje respuestas sin CORS.
   */
  app.use((req, res, next) => {
    const origin = (req.headers.origin as string | undefined) ?? '';
    const o = norm(origin);

    // Refleja el Origin si está permitido. Vary: Origin evita cache mixto por distintos orígenes.
    if (origin && ALLOWED_ORIGINS.has(o)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    // Preflight: el navegador envía OPTIONS cuando hay headers no simples (Authorization, etc.)
    if (req.method === 'OPTIONS') {
      res.setHeader(
        'Access-Control-Allow-Methods',
        'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS',
      );
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Authorization, Content-Type, Accept, X-Requested-With,X-Business-Unit-Id',
      );
      res.setHeader('Access-Control-Max-Age', '600');
      return res.status(204).send(); // 204 No Content indica preflight OK
    }

    next();
  });

  /**
   * CORS oficial de Nest: regla “formal” de validación de orígenes.
   * - origin: valida el Origin contra la whitelist
   * - methods/allowedHeaders/exposedHeaders: política para peticiones reales
   * - credentials: habilita envío de cookies o credenciales si fuera necesario
   *
   * El middleware anterior y este enableCors trabajan juntos:
   *  - middleware garantiza headers incluso ante errores
   *  - enableCors mantiene la whitelist y política general
   */
  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // permite curl/postman/healthchecks sin Origin
      const o = norm(origin);
      return cb(null, ALLOWED_ORIGINS.has(o)); // true=permitido, false=bloqueado
    },
    methods: 'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS',
    allowedHeaders:
      'Authorization,Content-Type,Accept,X-Requested-With,X-Business-Unit-Id',
    exposedHeaders: ['Content-Disposition'],
    credentials: true,
  });

  /**
   * Validaciones globales (producción):
   * - whitelist: elimina propiedades no definidas en DTOs (higiene del payload)
   * - transform: convierte tipos a los del DTO (p.ej. string -> number)
   * - forbidNonWhitelisted: false (no lanza 400; ya limpiamos con whitelist)
   */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  /**
   * Arranque del servidor: escucha en 0.0.0.0 para aceptar tráfico externo.
   */
  const port = parseInt(process.env.PORT ?? '4000', 10);
  await app.listen(port, '0.0.0.0');
  console.log('[BOOT] API on', await app.getUrl());
}
bootstrap();
