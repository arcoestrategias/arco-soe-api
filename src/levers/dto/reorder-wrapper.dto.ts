import { IsUUID, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ReorderLeverDto } from './reorder-lever.dto';

export class ReorderLeverWrapperDto {
  @IsUUID()
  positionId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderLeverDto)
  items: ReorderLeverDto[];
}
