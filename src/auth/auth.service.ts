import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import { UsersRepository } from 'src/users/repositories/users.repository';
import { comparePassword, hashPassword } from 'src/common/helpers/hash.helper';
import {
  LoginDto,
  RegisterDto,
  ForgotPasswordDto,
  ResetPasswordTokenDto,
} from './dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepo: UsersRepository,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(dto: LoginDto) {
    const user = await this.usersRepo.findByEmail(dto.email);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    const isValid = await comparePassword(dto.password, user.getPassword());

    if (!isValid) throw new UnauthorizedException('Credenciales inválidas');

    return user;
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto);
    const tokens = this.generateTokens(user.id);

    return {
      user: user.toResponse(),
      ...tokens,
    };
  }

  async register(dto: RegisterDto) {
    const existingEmail = await this.usersRepo.findByEmail(dto.email);
    if (existingEmail)
      throw new ConflictException('El email ya está registrado');

    if (dto.ide) {
      const existingIde = await this.usersRepo.findByIde(dto.ide);
      if (existingIde)
        throw new ConflictException('La cédula ya está registrada');
    }

    if (dto.username) {
      const existingUsername = await this.usersRepo.findByUsername(dto.username);
      if (existingUsername)
        throw new ConflictException('El nombre de usuario ya está en uso');
    }

    const hashedPassword = await hashPassword(dto.password);

    const newUser = await this.usersRepo.create({
      email: dto.email,
      password: hashedPassword,
      firstName: dto.firstName,
      lastName: dto.lastName,
      ide: dto.ide,
    });

    const tokens = this.generateTokens(newUser.id);

    return {
      user: newUser.toResponse(),
      ...tokens,
    };
  }

  async refresh(userId: string) {
    const tokens = this.generateTokens(userId);
    return tokens;
  }

  private generateTokens(userId: string) {
    const payload = { sub: userId };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersRepo.findByEmail(dto.email);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const resetToken = uuidv4();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.usersRepo.update(user.id, {
      resetToken,
      resetTokenExpiresAt: expiresAt,
    });

    return {
      token: resetToken,
    };
  }

  async resetPasswordWithToken(dto: ResetPasswordTokenDto) {
    const user = await this.usersRepo.findByResetToken(dto.token);
    if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
      throw new BadRequestException('Token expirado o inválido');
    }

    const newHashedPassword = await hashPassword(dto.newPassword);

    await this.usersRepo.update(user.id, {
      password: newHashedPassword,
      resetToken: null,
      resetTokenExpiresAt: null,
    });

    return {
      message: 'Contraseña reestablecida exitosamente',
    };
  }
}