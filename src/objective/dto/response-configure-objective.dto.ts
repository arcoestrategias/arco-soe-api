import { ObjectiveEntity } from '../entities/objective.entity';
import { ResponseObjectiveDto } from './response-objective.dto';

type ConfigureResult = {
  objective: ObjectiveEntity;
  indicatorUpdated: boolean;
  goalsRegenerated: boolean;
  monthsCount: number;
};

export class ResponseConfigureObjectiveDto {
  readonly objective: ResponseObjectiveDto;
  readonly indicatorUpdated: boolean;
  readonly goalsRegenerated: boolean;
  readonly monthsCount: number;

  constructor(result: ConfigureResult) {
    this.objective = new ResponseObjectiveDto(result.objective);
    this.indicatorUpdated = result.indicatorUpdated;
    this.goalsRegenerated = result.goalsRegenerated;
    this.monthsCount = result.monthsCount;
  }
}
