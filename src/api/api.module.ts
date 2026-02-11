import { Module } from '@nestjs/common';
import { AthleteController } from './athlete/athlete.controller';
import { AthleteService } from './athlete/athlete.service';
import { CompetitionController } from './competition/competition.controller';
import { CompetitionService } from './competition/competition.service';
import { ResultController } from './result/result.controller';
import { ResultService } from './result/result.service';
import { RaceController } from './race/race.controller';
import { RaceService } from './race/race.service';
import { RelayController } from './relay/relay.controller';
import { RelayService } from './relay/relay.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [
    AthleteController,
    CompetitionController,
    ResultController,
    RaceController,
    RelayController,
  ],
  providers: [
    AthleteService,
    CompetitionService,
    ResultService,
    RaceService,
    RelayService,
  ],
})
export class ApiModule {}
