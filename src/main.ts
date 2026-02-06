import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from './config/app.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get<ConfigService<AppConfig>>(ConfigService);
  const portStr = configService.get<string>('PORT');
  const port = portStr ? parseInt(portStr, 10) : 3000;
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
