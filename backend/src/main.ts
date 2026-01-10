import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
      'access-token', // nombre interno
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // ✅ deja guardado el token en swagger
    },
  });
  app.enableCors({
    origin: [
      'http://localhost:5173',   // Vite dev
      'http://localhost:4173',   // Vite preview (opcional)
      // en prod pondrás tu dominio frontend, ej:
      // 'https://admin.casadelkumis.co'
    ],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });
  await app.listen(3000);
}
bootstrap();
