import { IsOptional, IsUUID, IsInt, Min, IsBoolean } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class ListProjectParticipantsDto {
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsUUID()
  positionId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 50;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      if (value.toLowerCase() === 'true') return true;
      if (value.toLowerCase() === 'false') return false;
    }
    return undefined; // si viene algo raro, lo ignoramos
  })
  @IsBoolean()
  isActive?: boolean;
}
