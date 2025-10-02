import { IsOptional, IsUUID } from 'class-validator';

export class personQueryDto {
  @IsUUID()
  companyId: string;

  @IsUUID()
  businessUnitId: string;

  @IsUUID()
  @IsOptional()
  positionId?: string;
}

export type PersonRolePositionDto = {
  idUser: string | null;
  nameUser: string | null;
  idRole: string | null;
  nameRole: string | null;
  idPosition: string | null;
  namePosition: string | null;
};

export type CeoAndSpecialistDto = {
  ceo: PersonRolePositionDto;
  specialist: PersonRolePositionDto;
};
