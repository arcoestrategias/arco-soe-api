import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import { UsersRepository } from 'src/users/repositories/users.repository';
import { comparePassword, hashPassword } from 'src/common/helpers/hash.helper';
import { LoginDto, ForgotPasswordDto, ResetPasswordTokenDto } from './dto';
import { TokensDto } from './dto/tokens.dto';
import { NotificationService } from 'src/notifications/notifications.service';
import { buildUrl } from 'src/common/helpers/url.helper';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepo: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly notificationService: NotificationService,
  ) {}

  async login(dto: LoginDto): Promise<TokensDto> {
    const user = await this.usersRepo.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    const ok = await comparePassword(dto.password, user.getPassword());
    if (!ok) throw new UnauthorizedException('Credenciales inválidas');

    // --- limpiar reset expirado SIN mutar la entidad ---
    const hasReset = !!user.resetToken && !!user.resetTokenExpiresAt;
    const resetExpired =
      hasReset && new Date(user.resetTokenExpiresAt as Date) <= new Date();

    if (resetExpired) {
      await this.usersRepo.update(user.id, {
        resetToken: null,
        resetTokenExpiresAt: null,
      } as any);
    }

    // --- bloqueos ---
    if (!user.isEmailConfirmed) {
      throw new ForbiddenException(
        'Debes confirmar tu cuenta para iniciar sesión.',
      );
    }

    // si no expiró y sigue vigente, bloquear
    const resetActive = this.isResetInProgress(
      user.resetToken,
      user.resetTokenExpiresAt,
    );

    if (resetActive) {
      throw new ForbiddenException(
        'Tienes un restablecimiento de contraseña en curso. Completa el proceso o cancélalo para iniciar sesión.',
      );
    }

    return this.generateTokens(user.id);
  }

  async refresh(userId: string): Promise<TokensDto> {
    return this.generateTokens(userId);
  }

  private generateTokens(userId: string): TokensDto {
    const payload = { sub: userId };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
    });

    return { accessToken, refreshToken };
  }

  async forgotPassword(
    dto: ForgotPasswordDto,
  ): Promise<{ resetToken: string }> {
    const user = await this.usersRepo.findByEmail(dto.email);
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const resetToken = uuidv4();
    const expires = new Date(Date.now() + 1000 * 60 * 30); // 30 min

    await this.usersRepo.update(user.id, {
      resetToken,
      resetTokenExpiresAt: expires,
    } as any);

    const resetUrl = buildUrl(`/auth/reset?token=${resetToken}`);
    await this.notificationService.sendByCode({
      codeTemplate: 'RST',
      to: user.email,
      variables: {
        firstname: user.firstName ?? user.username ?? 'usuario',
        url: resetUrl,
      },
    });

    return { resetToken }; // útil para pruebas locales
  }

  async resetPasswordWithToken(
    dto: ResetPasswordTokenDto,
  ): Promise<{ message: string }> {
    const user = await this.usersRepo.findByResetToken(dto.token);
    if (!user) throw new BadRequestException('Token inválido');

    if (!user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
      throw new BadRequestException('Token expirado');
    }

    const newHashed = await hashPassword(dto.newPassword);

    await this.usersRepo.update(user.id, {
      password: newHashed,
      resetToken: null,
      resetTokenExpiresAt: null,
    } as any);

    await this.notificationService.sendByCode({
      codeTemplate: 'RSD',
      to: user.email,
      variables: {
        firstname: user.firstName ?? user.username ?? 'usuario',
        url: buildUrl('/auth/login'),
        contact: buildUrl('/ayuda'),
      },
    });

    return { message: 'Contraseña reestablecida exitosamente' };
  }

  async logout(userId: string): Promise<void> {
    await this.usersRepo.update(userId, {
      tokenInvalidBeforeAt: new Date(),
    } as any);
  }

  async confirmEmailByToken(token: string) {
    if (!token) throw new BadRequestException('Token requerido');

    const user = await this.usersRepo.findByEmailConfirmToken(token);
    if (
      !user ||
      !user.emailConfirmExpiresAt ||
      user.emailConfirmToken !== token
    ) {
      throw new NotFoundException('Token inválido');
    }
    if (new Date() > new Date(user.emailConfirmExpiresAt)) {
      throw new BadRequestException('Token expirado');
    }

    await this.usersRepo.update(user.id, {
      isEmailConfirmed: true,
      emailConfirmToken: null,
      emailConfirmExpiresAt: null,
    } as any);

    await this.notificationService.sendByCode({
      codeTemplate: 'ACF',
      to: user.email,
      variables: {
        firstname: user.firstName ?? user.username ?? 'usuario',
        url: buildUrl('/auth/login'),
        contact: buildUrl('/ayuda'),
      },
    });

    return { success: true };
  }

  private isResetInProgress(
    resetToken?: string | null,
    resetTokenExpiresAt?: Date | null,
  ) {
    return !!(
      resetToken &&
      resetTokenExpiresAt &&
      resetTokenExpiresAt > new Date()
    );
  }
}
