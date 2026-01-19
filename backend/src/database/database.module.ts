import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Athlete, AthleteSchema } from './schema/athlete.schema';
import { Competition, CompetitionSchema } from './schema/competition.schema';
import { Result, ResultSchema } from './schema/result.schema';
import { AthleteRepository } from './repository/athlete.repository';
import { ResultRepository } from './repository/result.repository';
import { createMongooseOptions } from '../config/database.config';
import type { AppConfig } from '../config/app.config';
import { CompetitionRepository } from './repository/competition.repository';
import { Race, RaceSchema } from './schema/race.schema';
import { RaceRepository } from './repository/race.repository';

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
      { name: Competition.name, schema: CompetitionSchema },
      { name: Result.name, schema: ResultSchema },
      { name: Race.name, schema: RaceSchema },
    ]),
  ],
  providers: [
    AthleteRepository,
    CompetitionRepository,
    ResultRepository,
    RaceRepository,
  ],
  exports: [
    MongooseModule,
    AthleteRepository,
    CompetitionRepository,
    ResultRepository,
    RaceRepository,
  ],
})
export class DatabaseModule {}
