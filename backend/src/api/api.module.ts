import { Module } from '@nestjs/common';
import { AthleteController } from './athlete/athlete.controller';
import { AthleteService } from './athlete/athlete.service';
import { RaceController } from './race/race.controller';
import { RaceService } from './race/race.service';
import { ResultController } from './result/result.controller';
import { ResultService } from './result/result.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AthleteController, RaceController, ResultController],
  providers: [AthleteService, RaceService, ResultService],
})
export class ApiModule {}
