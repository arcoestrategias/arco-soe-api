import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsBoolean, IsDate, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  resetToken?: string | null;

  @IsOptional()
  @IsDate()
  resetTokenExpiresAt?: Date | null;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  ide?: string;

  @IsOptional()
  @IsDate()
  lockedUntil?: Date;

  @IsOptional()
  @IsDate()
  lastLoginAt?: Date;

  @IsOptional()
  @IsString()
  emailConfirmToken?: string;

  @IsOptional()
  @IsDate()
  emailConfirmExpiresAt?: Date;

  @IsOptional()
  @IsBoolean()
  isEmailConfirmed?: boolean;
}
