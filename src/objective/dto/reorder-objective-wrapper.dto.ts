import { IsArray, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ReorderObjectiveDto } from './reorder-objective.dto';

export class ReorderObjectiveWrapperDto {
  @IsUUID()
  strategicPlanId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderObjectiveDto)
  items: ReorderObjectiveDto[];
}
