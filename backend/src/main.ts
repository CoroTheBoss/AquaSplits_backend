import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = (configService.get('port') as number) || 3000;
  const logger = new Logger('Bootstrap');

  // Enable CORS for frontend integration
  app.enableCors({
    origin: true,
    credentials: true,
  });

  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
