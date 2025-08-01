export class ResponseBusinessUnitDto {
  id: string;
  name: string;
  description: string;
  ide: string;
  legalRepresentativeName: string;
  address: string;
  phone: string;
  order: number;
  isPrivate: boolean;
  isGroup: boolean;
  isActive: boolean;
  companyId: string;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<ResponseBusinessUnitDto>) {
    Object.assign(this, partial);
  }
}
