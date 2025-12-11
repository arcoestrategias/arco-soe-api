import { PermissionEntity } from '../entities/permission.entity';

export class ResponsePermissionDto {
  id: string;
  name: string;
  description?: string | null;
  moduleId: string;
  isActive: boolean;

  constructor(permission: PermissionEntity) {
    this.id = permission.id;
    this.name = permission.name;
    this.description = permission.description;
    this.moduleId = permission.moduleId;
    this.isActive = permission.isActive;
  }
}
