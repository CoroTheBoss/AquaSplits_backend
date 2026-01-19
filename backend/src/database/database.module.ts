import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Athlete, AthleteSchema } from './schema/athlete.schema';
import { Race, RaceSchema } from './schema/race.schema';
import { Result, ResultSchema } from './schema/result.schema';
import { AthleteRepository } from './repository/athlete.repository';
import { RaceRepository } from './repository/race.repository';
import { ResultRepository } from './repository/result.repository';
import { createMongooseOptions } from '../config/database.config';
import type { AppConfig } from '../config/app.config';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService<AppConfig>) =>
        createMongooseOptions(configService),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: Athlete.name, schema: AthleteSchema },
      { name: Race.name, schema: RaceSchema },
      { name: Result.name, schema: ResultSchema },
    ]),
  ],
  providers: [AthleteRepository, RaceRepository, ResultRepository],
  exports: [
    MongooseModule,
    AthleteRepository,
    RaceRepository,
    ResultRepository,
  ],
})
export class DatabaseModule {}
