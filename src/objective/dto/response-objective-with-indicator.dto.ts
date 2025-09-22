import { ResponseObjectiveDto } from './response-objective.dto';
import { ResponseIndicatorDto } from 'src/indicator/dto/response-indicator.dto';

export class ResponseObjectiveWithIndicatorDto extends ResponseObjectiveDto {
  indicator: ResponseIndicatorDto | null;

  constructor(obj: any) {
    super(obj);
    this.indicator = obj?.indicator
      ? new ResponseIndicatorDto(obj.indicator)
      : null;
  }
}
