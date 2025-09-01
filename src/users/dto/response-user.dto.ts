export class UserBusinessUnitLinkDto {
  businessUnitId: string;
  businessUnitName?: string; // ⬅️ nuevo
  positionId: string | null;
  positionName?: string | null; // ⬅️ nuevo
  roleId: string | null;
  roleName?: string | null; // ⬅️ nuevo
  isResponsible: boolean;
}

export class ResponseUserDto {
  id: string;
  email: string;
  username?: string;
  ide?: string;
  telephone?: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  userBusinessUnits: UserBusinessUnitLinkDto[] | null;

  constructor(partial: Partial<ResponseUserDto>) {
    Object.assign(this, partial);
  }
}
