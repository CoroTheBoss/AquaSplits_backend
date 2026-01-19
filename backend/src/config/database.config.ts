import type { MongooseModuleOptions } from '@nestjs/mongoose';
import type { ConfigService } from '@nestjs/config';
import type { AppConfig } from './app.config';

/**
 * Central place to build Mongo connection options.
 * This mirrors the pattern you posted (useFactory + buildMongoUri),
 * and makes it easy to add more connections later.
 */
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
