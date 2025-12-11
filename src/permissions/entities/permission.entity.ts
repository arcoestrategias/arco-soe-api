import { Permission } from '@prisma/client';

export class PermissionEntity implements Permission {
  id: string;
  name: string;
  description: string | null;
  moduleId: string;
  isActive: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}
