import {
  IsString,
  IsEmail,
  Length,
  IsOptional,
  IsBoolean,
  IsUUID,
} from 'class-validator';

export class CreateExternalUserDto {
  @IsString()
  @Length(1, 500)
  name!: string;

  @IsEmail()
  @Length(1, 255)
  email!: string;
}

export class UpdateExternalUserDto {
  @IsOptional()
  @IsString()
  @Length(1, 500)
  name?: string;

  @IsOptional()
  @IsEmail()
  @Length(1, 255)
  email?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
