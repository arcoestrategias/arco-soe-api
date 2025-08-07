import { IsUUID, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ReorderStrategicValueDto } from './reorder-strategic-value.dto';

export class ReorderStrategicValueWrapperDto {
  @IsUUID()
  strategicPlanId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderStrategicValueDto)
  items: ReorderStrategicValueDto[];
}
