// src/features/strategic-projects/dto/reorder-strategic-project.dto.ts
import { IsUUID, IsInt, Min, IsOptional, IsBoolean } from 'class-validator';

export class ReorderStrategicProjectDto {
  @IsUUID()
  id!: string;

  @IsInt()
  @Min(1) // 1-based
  order!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
