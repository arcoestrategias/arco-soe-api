export class ResponsePermissionDto {
  id: string;
  name: string;
  description?: string | null;
  moduleId: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<ResponsePermissionDto>) {
    Object.assign(this, partial);
  }
}
