import {
  ArrayNotEmpty,
  IsArray,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReorderProjectFactorDto } from './reorder-project-factor.dto';

export class ReorderProjectFactorWrapperDto {
  @IsUUID()
  projectId!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ReorderProjectFactorDto)
  items!: ReorderProjectFactorDto[];
}
