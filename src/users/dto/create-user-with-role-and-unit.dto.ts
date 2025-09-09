import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class CreateUserWithRoleAndUnitDto extends CreateUserDto {
  @IsUUID()
  @IsNotEmpty()
  businessUnitId: string;

  @IsUUID()
  @IsNotEmpty()
  roleId: string;

  @IsUUID()
  @IsOptional()
  positionId?: string;

  @IsBoolean()
  @IsOptional()
  isResponsible?: boolean;
}
