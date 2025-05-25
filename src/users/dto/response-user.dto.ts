export class ResponseUserDto {
  id: string;
  email: string;
  username?: string;
  ide?: string;
  telephone?: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  roleId: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<ResponseUserDto>) {
    Object.assign(this, partial);
  }
}
