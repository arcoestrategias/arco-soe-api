export class UserEntity {
  readonly id: string;
  readonly email: string;
  readonly username?: string;
  readonly ide: string;
  readonly telephone?: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly isPlatformAdmin: boolean;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  private readonly password: string;
  readonly tokenInvalidBeforeAt?: Date | null;

  readonly resetToken?: string | null;
  readonly resetTokenExpiresAt?: Date | null;
  readonly lastLoginAt?: Date;
  readonly lockedUntil?: Date;
  readonly loginAttempts?: number;
  readonly emailConfirmToken?: string | null;
  readonly emailConfirmExpiresAt?: Date | null;
  readonly isEmailConfirmed?: boolean;

  constructor(user: any) {
    Object.assign(this, user);
  }

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  getPassword(): string {
    return this.password;
  }

  getTokenInvalidBeforeAt(): Date | undefined {
    return this.tokenInvalidBeforeAt ?? undefined;
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
      isPlatformAdmin: this.isPlatformAdmin,
      isActive: this.isActive,
      lastLoginAt: this.lastLoginAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
