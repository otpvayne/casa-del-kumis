import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ✅ Swagger Config
  const config = new DocumentBuilder()
    .setTitle('Casa del Kumis API')
    .setDescription('API para vouchers, banco, redeban y conciliación.')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Pega aquí tu JWT: Bearer <token>',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  // ✅ CORS (Render + Vercel + local)
  // En Render agrega: CORS_ORIGIN=https://tu-frontend.vercel.app
 const corsOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'https://casa-del-kumis.onrender.com',
  'https://casa-del-kumis-5ch4dflrc-monkeys-projects-5b48c3b9.vercel.app', // ✅ permitir Swagger en prod
  ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : []),
].map(s => s.trim()).filter(Boolean);

app.enableCors({
  origin: (origin, cb) => {
    // Permite requests sin origin (Postman/Swagger/cURL)
    if (!origin) return cb(null, true);
    if (corsOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS bloqueado para: ${origin}`), false);
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
});



  // ✅ SERVIR UPLOADS COMO ESTÁTICOS (ojo: en Render el disco es efímero)
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // ✅ Render inyecta PORT. Además escucha en 0.0.0.0
  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 API corriendo en puerto ${port}`);
}
bootstrap();
