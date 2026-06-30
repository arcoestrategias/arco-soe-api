import { Controller, Get, UseGuards, Req, Res } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { OutlookCalendarService } from './outlook-calendar.service';
import { Response } from 'express';

@Controller('outlook-calendar')
export class OutlookCalendarController {
  constructor(
    private readonly outlookCalendarService: OutlookCalendarService,
  ) {}

  // ── Estado de conexión ────────────────────────────────────────────────────
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async status(@Req() req: any) {
    const isConnected = await this.outlookCalendarService.isConnected(req.user.sub);
    return { isConnected };
  }

  // ── Iniciar conexión OAuth con scope de Calendar ──────────────────────────
  @Get('connect')
  @UseGuards(JwtAuthGuard)
  async connect(@Req() req: any, @Res() res: Response) {
    const clientId = process.env.OUTLOOK_CLIENT_ID;
    const tenantId = process.env.OUTLOOK_TENANT_ID;
    const callbackUrl = process.env.OUTLOOK_CALENDAR_CALLBACK_URL;

    const params = new URLSearchParams({
      client_id: clientId!,
      response_type: 'code',
      redirect_uri: callbackUrl!,
      scope: 'Calendars.ReadWrite offline_access',
      state: req.user.sub, // userId para el callback
      prompt: 'consent',
    });

    const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
    res.redirect(url);
  }

  // ── Callback OAuth de Calendar ────────────────────────────────────────────
  @Get('callback')
  async callback(@Req() req: any, @Res() res: Response) {
    const { code, state: userId } = req.query;
    const frontendUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:3000';

    if (!code || !userId) {
      return res.redirect(`${frontendUrl}/meetings?calendar=error&provider=outlook`);
    }

    try {
      const tokenRes = await fetch(
        `https://login.microsoftonline.com/${process.env.OUTLOOK_TENANT_ID}/oauth2/v2.0/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.OUTLOOK_CLIENT_ID!,
            client_secret: process.env.OUTLOOK_CLIENT_SECRET!,
            code: code as string,
            redirect_uri: process.env.OUTLOOK_CALENDAR_CALLBACK_URL!,
            grant_type: 'authorization_code',
            scope: 'Calendars.ReadWrite offline_access',
          }),
        },
      );

      const tokens = await tokenRes.json();

      if (!tokens.access_token) {
        return res.redirect(`${frontendUrl}/meetings?calendar=error&provider=outlook`);
      }

      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

      await this.outlookCalendarService.saveTokens(
        userId as string,
        tokens.access_token,
        tokens.refresh_token ?? null,
        expiresAt,
      );

      res.redirect(`${frontendUrl}/meetings?calendar=connected&provider=outlook`);
    } catch (error) {
      res.redirect(`${frontendUrl}/meetings?calendar=error&provider=outlook`);
    }
  }

  // ── Desconectar calendario ────────────────────────────────────────────────
  @Get('disconnect')
  @UseGuards(JwtAuthGuard)
  async disconnect(@Req() req: any) {
    await this.outlookCalendarService.disconnect(req.user.sub);
    return { disconnected: true };
  }
}
