import { IsBoolean, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class ReorderStrategicSuccessFactorDto {
  @IsUUID()
  id: string;

  @IsInt()
  @Min(0)
  order: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
