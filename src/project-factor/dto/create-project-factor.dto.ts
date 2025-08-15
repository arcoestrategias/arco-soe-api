import {
  IsString,
  Length,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  IsNotEmpty,
} from 'class-validator';

export class CreateProjectFactorDto {
  @IsString()
  @Length(3, 150)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string | null;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  result?: string | null;

  @IsUUID()
  @IsNotEmpty()
  projectId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  order?: number; // lo calculamos automáticamente en el service
}
