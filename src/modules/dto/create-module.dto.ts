import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateModuleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  shortCode: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;
}
