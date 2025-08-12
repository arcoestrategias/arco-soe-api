import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetMonthlyIcoDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt() @Min(1) @Max(12)
  month?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt() @Min(1900)
  year?: number;

  /**
   * Modo de promedio:
   * - "all": incluye no medidos como 0 (sum / totalGoals)
   * - "measured": promedia solo medidos (sum / measuredCount)
   */
  @IsOptional()
  @IsIn(['all', 'measured'])
  mode?: 'all' | 'measured';
}
