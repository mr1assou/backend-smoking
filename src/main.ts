import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.getHttpAdapter().get('/', (req: any, res: any) => {
    res.json({ message: 'Welcome to Hotel Royal API! 🏨' });
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();



