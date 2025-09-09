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

  //**"mover" desde esta BU a la nueva. Si fromBusinessUnitId no viene, el PATCH funciona como antes (actualiza el vínculo de la BU destino, sin “mover”).*/
  @IsOptional()
  @IsUUID()
  fromBusinessUnitId?: string;
}
