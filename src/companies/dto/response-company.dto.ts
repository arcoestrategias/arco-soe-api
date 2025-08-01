export class ResponseCompanyDto {
  id: string;
  name: string;
  isActive: boolean;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<ResponseCompanyDto>) {
    Object.assign(this, partial);
  }
}
