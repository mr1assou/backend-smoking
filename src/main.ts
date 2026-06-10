import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // JSON APIs must not return 304 — clients expect a body on every GET /auth/me.
  const expressApp = app.getHttpAdapter().getInstance() as {
    set: (key: string, value: boolean) => void;
  };
  expressApp.set('etag', false);

  app.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    next();
  });

  app.use(cookieParser());
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  app.getHttpAdapter().get('/', (_req, res) => {
    res.json({ message: 'Quit Smoking API' });
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();



