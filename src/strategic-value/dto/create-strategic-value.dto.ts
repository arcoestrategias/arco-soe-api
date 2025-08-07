import {
  IsNotEmpty,
  IsString,
  MaxLength,
  IsUUID,
  IsOptional,
  IsInt,
  Min,
} from 'class-validator';

export class CreateStrategicValueDto {
  @IsString()
  @MaxLength(150)
  @IsNotEmpty()
  name: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;

  @IsUUID()
  @IsNotEmpty()
  strategicPlanId: string;
}
