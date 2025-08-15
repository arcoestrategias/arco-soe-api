import { IsUUID, IsInt, Min, IsOptional, IsBoolean } from 'class-validator';

export class ReorderProjectTaskDto {
  @IsUUID()
  id!: string;

  @IsInt()
  @Min(1)
  order!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
