import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ForgotPasswordDto, LoginDto, ResetPasswordTokenDto } from './dto';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { SuccessMessage } from 'src/core/decorators/success-message.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('confirm')
  @SuccessMessage('Cuenta confirmada')
  async confirmEmail(@Body() body: { token: string }) {
    return this.authService.confirmEmailByToken(body.token);
  }

  @Post('login')
  @SuccessMessage('Inicio de sesión exitoso')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @SuccessMessage('Tokens actualizados')
  async refresh(@Req() req: any) {
    // req.user viene de JwtRefreshStrategy.validate → { userId: sub }
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

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @SuccessMessage('Sesión finalizada')
  async logout(@Req() req: any) {
    await this.authService.logout(req.user.sub);
    return { ok: true };
  }
}
