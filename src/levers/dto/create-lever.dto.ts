import {
  IsNotEmpty,
  IsString,
  MaxLength,
  IsUUID,
  IsOptional,
  IsInt,
  Min,
} from 'class-validator';

export class CreateLeverDto {
  @IsString()
  @MaxLength(500)
  @IsNotEmpty()
  name: string;

  @IsString()
  @MaxLength(1000)
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;

  @IsUUID()
  @IsNotEmpty()
  positionId: string;
}
