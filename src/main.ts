import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import { ValidationPipe } from '@nestjs/common';
import { mkdirSync } from 'fs';

async function bootstrap() {
  mkdirSync('uploads', { recursive: true });

  const app = await NestFactory.create(AppModule);
  
  // Validation globale des DTOs
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  const corsOrigin = process.env.CORS_ORIGIN?.trim();
  if (!corsOrigin) {
    throw new Error('CORS_ORIGIN must be set in .env');
  }

  app.enableCors({
    origin: corsOrigin,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  app.getHttpAdapter().get('/', (req: any, res: any) => {
    res.json({ message: 'Welcome to Hotel Royal API! 🏨' });
  });

  // Écouter sur 0.0.0.0 pour accepter les connexions venant de l'extérieur (ton téléphone)
  await app.listen(3001, '0.0.0.0');
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();