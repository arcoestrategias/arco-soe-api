import { Controller, Get, UseGuards, Req, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { Response } from 'express';

@Controller('auth/google')
export class GoogleController {
  constructor(private authService: AuthService) {}

  @Get()
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req) {
    // Inicia flujo OAuth - redirige a Google
  }

  @Get('callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.loginWithGoogle(req.user);

    const isProduction = process.env.NODE_ENV === 'production';
    
    // Configuración de cookies
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction, // Solo HTTPS en producción
      sameSite: isProduction ? 'none' as const : 'lax' as const,
      maxAge: 1000 * 60 * 60 * 24, // access_token: 1 día
    };

    // En producción, establecer dominio para compartir entre subdominios
    if (isProduction) {
      cookieOptions['domain'] = '.soe.la';
    }
    // En desarrollo (localhost), no establecer dominio

    res.cookie('access_token', result.accessToken, cookieOptions);
    res.cookie('refresh_token', result.refreshToken, {
      ...cookieOptions,
      maxAge: 1000 * 60 * 60 * 24 * 7, // refresh_token: 7 días
    });

    // Redirigir al frontend SIN tokens en URL
    const frontendUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
    const redirectUrl = `${frontendUrl}/login?auth=success&needsTermsAcceptance=${result.needsTermsAcceptance}`;
    
    console.log('[Google OAuth] Redirecting to:', redirectUrl);
    res.status(302).redirect(redirectUrl);
  }
}