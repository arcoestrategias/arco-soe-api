export class GroupedUserEntity {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  positionId: string | null;
  positionName: string | null;
}

export class GroupedUsersByRoleEntity {
  roleId: string;
  roleName: string;
  users: GroupedUserEntity[];
}

export class GroupedUsersByUnitEntity {
  businessUnitId: string;
  businessUnitName: string;
  roles: GroupedUsersByRoleEntity[];
}
