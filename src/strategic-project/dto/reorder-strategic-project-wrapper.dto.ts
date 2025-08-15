import {
  ArrayNotEmpty,
  IsArray,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReorderStrategicProjectDto } from './reorder-strategic-project.dto.ts';

export class ReorderStrategicProjectWrapperDto {
  @IsUUID()
  strategicPlanId!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ReorderStrategicProjectDto)
  items!: ReorderStrategicProjectDto[];
}
