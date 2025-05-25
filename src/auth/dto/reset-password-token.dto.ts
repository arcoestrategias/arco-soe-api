import { IsString, MinLength } from 'class-validator';

export class ResetPasswordTokenDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}
