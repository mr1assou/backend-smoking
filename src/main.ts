import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Modification cruciale : Autoriser toutes les origines pour le développement mobile
  app.enableCors({
    origin: true, // Permet à ton mobile (IP) de se connecter sans blocage
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
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