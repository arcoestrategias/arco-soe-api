import { Controller, Get, UseGuards, Req, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { GoogleCalendarService } from './google-calendar.service';
import { google } from 'googleapis';
import { Response } from 'express';

@Controller('google-calendar')
export class GoogleCalendarController {
  constructor(private readonly googleCalendarService: GoogleCalendarService) {}

  // ── Estado de conexión ────────────────────────────────────────────────────
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async status(@Req() req: any) {
    const isConnected = await this.googleCalendarService.isConnected(
      req.user.sub,
    );
    return { isConnected };
  }

  // ── Iniciar conexión OAuth con scope de Calendar ──────────────────────────
  @Get('connect')
  @UseGuards(JwtAuthGuard)
  async connect(@Req() req: any, @Res() res: Response) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALENDAR_CALLBACK_URL,
    );

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent', // Fuerza refresh_token en cada conexión
      scope: ['https://www.googleapis.com/auth/calendar.events'],
      state: req.user.sub, // Pasar userId en state para el callback
    });

    res.redirect(url);
  }

  // ── Callback OAuth de Calendar ────────────────────────────────────────────
  @Get('callback')
  async callback(@Req() req: any, @Res() res: Response) {
    const { code, state: userId } = req.query;
    const frontendUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:3000';

    if (!code || !userId) {
      return res.redirect(`${frontendUrl}/settings?calendar=error`);
    }

    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_CALENDAR_CALLBACK_URL,
      );

      const { tokens } = await oauth2Client.getToken(code as string);

      await this.googleCalendarService.saveTokens(
        userId as string,
        tokens.access_token!,
        tokens.refresh_token ?? null,
        tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      );

      res.redirect(`${frontendUrl}/meetings?calendar=connected`);
    } catch (error) {
      res.redirect(`${frontendUrl}/meetings?calendar=error`);
    }
  }

  // ── Desconectar calendario ────────────────────────────────────────────────
  @Get('disconnect')
  @UseGuards(JwtAuthGuard)
  async disconnect(@Req() req: any) {
    await this.googleCalendarService.disconnect(req.user.sub);
    return { disconnected: true };
  }
}
