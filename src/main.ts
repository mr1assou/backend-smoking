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

  // Any front-end URL (not only localhost:3000) may call this API from the browser.
  // Who can use protected data is still decided by JWT/auth guards — CORS only allows the browser tab’s origin.
  // CORS_ORIGIN=* or empty → reflect request Origin (works with credentials: true; literal '*' does not).
  const corsOrigin = process.env.CORS_ORIGIN?.trim();
  const allowAnyOrigin = !corsOrigin || corsOrigin === '*';

  app.enableCors({
    origin: allowAnyOrigin ? true : corsOrigin,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  app.getHttpAdapter().get('/', (req: any, res: any) => {
    res.json({ message: 'Welcome to Hotel Royal Manssour API! 🏨' });
  });

  // Écouter sur 0.0.0.0 pour accepter les connexions venant de l'extérieur (ton téléphone)
  await app.listen(3001, '0.0.0.0');
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();