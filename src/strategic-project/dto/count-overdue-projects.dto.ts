import { IsUUID, IsOptional, IsDateString } from 'class-validator';

export class CountOverdueProjectsDto {
  @IsUUID()
  positionId!: string;

  /** ISO 8601; si no se envía, se usa la fecha/hora actual */
  @IsOptional()
  @IsDateString()
  at?: string;
}
