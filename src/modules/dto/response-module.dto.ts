export class ResponseModuleDto {
  id: string;
  name: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<ResponseModuleDto>) {
    Object.assign(this, partial);
  }
}
