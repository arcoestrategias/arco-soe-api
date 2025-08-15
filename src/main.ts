import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { AppModule } from './app.module';
// import { Prisma } from '@prisma/client';

async function bootstrap() {
  // Creamos la aplicación Nest usando Express como plataforma base
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // const model = Prisma.dmmf.datamodel.models.find(
  //   (m) => m.name === 'StrategicProject',
  // );
  // console.log(
  //   'PRISMA MODEL StrategicProject (runtime):',
  //   JSON.stringify(model, null, 2),
  // );

  // Prefijo global para todas las rutas: todos los endpoints comienzan con /api/v1
  app.setGlobalPrefix('api/v1');

  // Validaciones globales: transforma, elimina propiedades no permitidas,
  // y lanza error si se reciben campos desconocidos
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // Transforma automáticamente los DTOs
      whitelist: true, // Elimina propiedades que no están en los DTOs
      forbidNonWhitelisted: true, // Lanza error si hay propiedades no permitidas
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Configura la carpeta de archivos estáticos (como imágenes o PDFs)
  // En este caso: /uploads será accesible públicamente
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
    index: false,
    setHeaders: (res, path, stat) => {
      const allowedOrigins = ['http://localhost:3000'];
      const requestOrigin = res.req.headers.origin;

      // Permite CORS solo desde orígenes permitidos
      if (allowedOrigins.includes(requestOrigin)) {
        res.setHeader('Access-Control-Allow-Origin', requestOrigin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }

      // Habilita el cacheo por 1 hora para recursos estáticos
      res.setHeader('Cache-Control', 'public, max-age=3600');
    },
  });

  // Configura CORS a nivel global (para todas las rutas)
  app.enableCors({
    origin: ['http://localhost:3000'],
    credentials: true, // Permite el envío de cookies y headers de autorización
  });

  // Levanta el servidor en el puerto configurado, o 3000 por defecto
  await app.listen(process.env.PORT ?? 3000);
  console.log(`App running on port ${process.env.PORT}`);
}
bootstrap();
