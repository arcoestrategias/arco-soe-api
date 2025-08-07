import { IsUUID, IsInt, Min, IsBoolean, IsOptional } from 'class-validator';

export class ReorderStrategicValueDto {
  @IsUUID()
  id: string;

  @IsInt()
  @Min(0)
  order: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
