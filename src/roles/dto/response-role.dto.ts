export class ResponseRoleDto {
  id: string;
  name: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<ResponseRoleDto>) {
    Object.assign(this, partial);
  }
}
