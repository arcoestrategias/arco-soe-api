import { IsUUID, IsInt, Min, IsOptional, IsBoolean } from 'class-validator';

export class ReorderProjectFactorDto {
  @IsUUID()
  id!: string;

  @IsInt()
  @Min(1)
  order!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
