import { IsArray, IsInt, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ReorderPriorityDto {
  @IsUUID()
  id!: string;
  @IsInt()
  @Min(0)
  order!: number;
}

export class ReorderPriorityWrapperDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderPriorityDto)
  items!: ReorderPriorityDto[];
}
