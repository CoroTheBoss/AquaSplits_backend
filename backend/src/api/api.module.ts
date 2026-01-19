import { Module } from '@nestjs/common';
import { AthleteController } from './athlete/athlete.controller';
import { AthleteService } from './athlete/athlete.service';
import { CompetitionController } from './competition/competition.controller';
import { CompetitionService } from './competition/competition.service';
import { ResultController } from './result/result.controller';
import { ResultService } from './result/result.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AthleteController, CompetitionController, ResultController],
  providers: [AthleteService, CompetitionService, ResultService],
})
export class ApiModule {}
