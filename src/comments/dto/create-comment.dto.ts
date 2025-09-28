import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  name!: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  moduleShortcode?: string;

  @IsUUID()
  @IsNotEmpty()
  referenceId!: string;
}
