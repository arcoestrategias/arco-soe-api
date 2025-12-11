import { Module } from '@prisma/client';

export class ModuleEntity implements Module {
  id: string;
  name: string;
  shortCode: string;
  description: string | null;
  isActive: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}
