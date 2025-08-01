export class PermissionActions {
  access: boolean;
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
  export: boolean;
  approve: boolean;
  assign: boolean;
}

export class ResponsePermissionsByModuleDto {
  modules: Record<string, PermissionActions>;
}
