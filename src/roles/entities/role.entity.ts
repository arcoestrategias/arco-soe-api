export class RoleEntity {
  readonly id: string;
  readonly name: string;
  readonly description?: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(role: any) {
    this.id = role.id;
    this.name = role.name;
    this.description = role.description ?? null;
    this.createdAt = role.createdAt;
    this.updatedAt = role.updatedAt;
  }
}
