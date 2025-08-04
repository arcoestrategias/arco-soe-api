import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordTokenDto,
} from './dto';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { SuccessMessage } from 'src/core/decorators/success-message.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @SuccessMessage('Inicio de sesión exitoso')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  @SuccessMessage('Tokens actualizados')
  async refresh(@Req() req: any) {
    return this.authService.refresh(req.user.userId);
  }

  @Post('forgot-password')
  @SuccessMessage('Token de recuperación generado')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @SuccessMessage('Contraseña reestablecida exitosamente')
  async resetPasswordWithToken(@Body() dto: ResetPasswordTokenDto) {
    return this.authService.resetPasswordWithToken(dto);
  }
}
