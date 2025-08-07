import { PartialType } from '@nestjs/mapped-types';
import { CreateObjectiveGoalDto } from './create-objective-goal.dto';

export class UpdateObjectiveGoalDto extends PartialType(CreateObjectiveGoalDto) {}
