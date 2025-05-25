export class UserEntity {
  readonly id: string;
  readonly email: string;
  readonly username?: string;
  readonly ide: string;
  readonly telephone?: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  private readonly password: string;

  readonly resetToken?: string | null;
  readonly resetTokenExpiresAt?: Date | null;
  readonly lastLoginAt?: Date;
  readonly lockedUntil?: Date;
  readonly loginAttempts?: number;
  readonly emailConfirmToken?: string | null;
  readonly emailConfirmExpiresAt?: Date | null;
  readonly isEmailConfirmed?: boolean;
  readonly roleId: string;

  constructor(user: any) {
    Object.assign(this, user);
  }

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  getPassword(): string {
    return this.password;
  }

  toResponse() {
    return {
      id: this.id,
      email: this.email,
      username: this.username,
      ide: this.ide,
      telephone: this.telephone,
      firstName: this.firstName,
      lastName: this.lastName,
      fullName: this.fullName,
      isActive: this.isActive,
      lastLoginAt: this.lastLoginAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
