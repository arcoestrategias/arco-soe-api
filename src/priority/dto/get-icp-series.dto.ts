import { IsUUID, IsOptional, IsString, Matches } from 'class-validator';

export class GetIcpSeriesDto {
  @IsUUID()
  positionId!: string;

  @IsOptional()
  @IsUUID()
  objectiveId?: string;

  // YYYY-MM
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'from debe ser YYYY-MM' })
  from!: string;

  // YYYY-MM
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'to debe ser YYYY-MM' })
  to!: string;
}
