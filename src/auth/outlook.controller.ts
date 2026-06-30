import { Controller, Get, UseGuards, Req, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { Response } from 'express';

@Controller('auth/outlook')
export class OutlookController {
  constructor(private authService: AuthService) {}

  @Get()
  @UseGuards(AuthGuard('microsoft'))
  async outlookAuth(@Req() req) {
    // Inicia flujo OAuth — redirige a Microsoft
  }

  @Get('callback')
  @UseGuards(AuthGuard('microsoft'))
  async outlookAuthRedirect(
    @Req() req,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const result = await this.authService.loginWithOutlook(req.user);

      const isProduction = process.env.NODE_ENV === 'production';
      const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? ('none' as const) : ('lax' as const),
        maxAge: 1000 * 60 * 60 * 24,
      };

      if (isProduction) cookieOptions['domain'] = '.soe.la';

      res.cookie('access_token', result.accessToken, cookieOptions);
      res.cookie('refresh_token', result.refreshToken, {
        ...cookieOptions,
        maxAge: 1000 * 60 * 60 * 24 * 7,
      });

      const frontendUrl =
        process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
      res
        .status(302)
        .redirect(
          `${frontendUrl}/login?auth=success&needsTermsAcceptance=${result.needsTermsAcceptance}&token=${result.accessToken}&refreshToken=${result.refreshToken}`,
        );
    } catch (error) {
      const frontendUrl =
        process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
      const message = encodeURIComponent(
        (error as any)?.message ?? 'Error al iniciar sesión con Microsoft',
      );
      res
        .status(302)
        .redirect(`${frontendUrl}/login?auth=error&message=${message}`);
    }
  }
}
