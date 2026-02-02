import type { MongooseModuleOptions } from '@nestjs/mongoose';
import type { ConfigService } from '@nestjs/config';
import type { AppConfig } from './app.config';

export function buildMongoUri(
  configService: ConfigService<AppConfig>,
  envKey: keyof AppConfig = 'MONGODB_URI',
) {
  return configService.get<string>(envKey);
}

export function createMongooseOptions(
  configService: ConfigService<AppConfig>,
  envKey: keyof AppConfig = 'MONGODB_URI',
): MongooseModuleOptions {
  return {
    uri: buildMongoUri(configService, envKey),
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  };
}
