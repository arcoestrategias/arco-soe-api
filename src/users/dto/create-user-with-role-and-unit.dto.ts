import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class CreateUserWithRoleAndUnitDto extends CreateUserDto {
  @IsUUID()
  @IsNotEmpty()
  businessUnitId: string;

  @IsUUID()
  @IsNotEmpty()
  roleId: string;
}
