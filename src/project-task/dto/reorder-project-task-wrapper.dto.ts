import {
  ArrayNotEmpty,
  IsArray,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReorderProjectTaskDto } from './reorder-project-task.dto';

export class ReorderProjectTaskWrapperDto {
  @IsUUID()
  projectFactorId!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ReorderProjectTaskDto)
  items!: ReorderProjectTaskDto[];
}
