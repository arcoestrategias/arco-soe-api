import { IsUUID } from 'class-validator';

export class CeoSpecialistQueryDto {
  @IsUUID()
  companyId: string;

  @IsUUID()
  businessUnitId: string;
}

export type PersonRolePosition = {
  idUser: string | null;
  nameUser: string | null;
  idRole: string | null;
  nameRole: string | null;
  idPosition: string | null;
  namePosition: string | null;
};

export type CeoAndSpecialistDto = {
  ceo: PersonRolePosition;
  specialist: PersonRolePosition;
};
