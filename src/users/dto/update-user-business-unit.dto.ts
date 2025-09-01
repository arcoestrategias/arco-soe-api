import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateUserBusinessUnitDto {
  @IsOptional()
  @IsUUID()
  roleId?: string | null;

  @IsOptional()
  @IsUUID()
  positionId?: string | null;

  @IsOptional()
  @IsBoolean()
  isResponsible?: boolean;
}
