import { plainToInstance } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  validateSync,
} from 'class-validator';

export class AppConfig {
  @IsOptional()
  @IsString()
  @Matches(/^\d+$/, { message: 'PORT must be numeric (string)' })
  PORT?: string;

  @IsNotEmpty()
  @IsString()
  MONGODB_URI: string;
}

/**
 * Used by `ConfigModule.forRoot({ validate })`.
 * Nest passes all env vars into this function; if validation fails, the app
 * throws during boot so you don’t run with a broken config.
 */
export function validateEnv(config: Record<string, unknown>): AppConfig {
  const validated = plainToInstance(AppConfig, config, {
    enableImplicitConversion: false,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
    whitelist: true,
  });

  if (errors.length > 0) {
    const details = errors
      .map((e) => {
        const constraints = e.constraints
          ? Object.values(e.constraints).join(', ')
          : 'invalid';
        return `${e.property}: ${constraints}`;
      })
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  return validated;
}
