export class PermissionEntity {
  readonly id: string;
  readonly name: string;
  readonly description?: string | null;
  readonly moduleId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(permission: any) {
    this.id = permission.id;
    this.name = permission.name;
    this.description = permission.description ?? null;
    this.moduleId = permission.moduleId;
    this.createdAt = permission.createdAt;
    this.updatedAt = permission.updatedAt;
  }
}
