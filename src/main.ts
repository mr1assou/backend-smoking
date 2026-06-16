import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import type { Application, NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // JSON APIs must not return 304 — clients expect a body on every GET /auth/me.
  const expressApp = app.getHttpAdapter().getInstance() as Application;
  expressApp.set('etag', false);

  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    next();
  });

  app.use(cookieParser());
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  expressApp.get('/', (_req: Request, res: Response) => {
    res.json({ message: 'Quit Smoking API' });
  });

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
