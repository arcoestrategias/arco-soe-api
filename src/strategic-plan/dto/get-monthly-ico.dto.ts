import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetMonthlyIcoDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number; // si no se envía, usa el mes actual

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  year?: number; // si no se envía, usa el año actual

  /**
   * Modo de promedio:
   * - "all": incluye no medidos como 0 (sum / totalGoals)
   * - "measured": promedia solo los que sí tienen indexCompliance (sum / measuredCount)
   */
  @IsOptional()
  @IsIn(['all', 'measured'])
  mode?: 'all' | 'measured';
}
