export class ResponseGroupedUsersByUnitDto {
  businessUnitId: string;
  businessUnitName: string;
  roles: {
    roleId: string;
    roleName: string;
    users: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      positionId: string | null;
      positionName: string | null;
    }[];
  }[];
}
