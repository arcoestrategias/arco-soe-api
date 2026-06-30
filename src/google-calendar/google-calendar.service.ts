import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { google } from 'googleapis';

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Crear cliente OAuth2 para un usuario ──────────────────────────────────
  private async getOAuthClient(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        googleCalendarAccessToken: true,
        googleCalendarRefreshToken: true,
        googleCalendarTokenExpiresAt: true,
      },
    });

    if (!user?.googleCalendarAccessToken) return null;

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL,
    );

    oauth2Client.setCredentials({
      access_token: user.googleCalendarAccessToken,
      refresh_token: user.googleCalendarRefreshToken ?? undefined,
      expiry_date: user.googleCalendarTokenExpiresAt?.getTime() ?? undefined,
    });

    // Auto-refresh token si está por expirar
    oauth2Client.on('tokens', async (tokens) => {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          googleCalendarAccessToken: tokens.access_token ?? undefined,
          googleCalendarTokenExpiresAt: tokens.expiry_date
            ? new Date(tokens.expiry_date)
            : undefined,
        },
      });
    });

    return oauth2Client;
  }

  // ── Verificar si el usuario tiene calendario conectado ────────────────────
  async isConnected(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { googleCalendarAccessToken: true },
    });
    return !!user?.googleCalendarAccessToken;
  }

  // ── Desconectar calendario ────────────────────────────────────────────────
  async disconnect(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        googleCalendarAccessToken: null,
        googleCalendarRefreshToken: null,
        googleCalendarTokenExpiresAt: null,
      },
    });
  }

  // ── Crear evento en Google Calendar ──────────────────────────────────────
  async createEvent(
    userId: string,
    meeting: {
      id: string;
      name: string;
      purpose?: string | null;
      location?: string | null;
      startDate: Date;
      endDate: Date;
      participants: { email: string; name: string }[];
    },
  ): Promise<string | null> {
    const auth = await this.getOAuthClient(userId);
    if (!auth) return null;

    try {
      const calendar = google.calendar({ version: 'v3', auth });

      const event = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary: meeting.name,
          description: meeting.purpose ?? undefined,
          location: meeting.location ?? undefined,
          start: {
            dateTime: meeting.startDate.toISOString(),
            timeZone: 'America/Guayaquil',
          },
          end: {
            dateTime: meeting.endDate.toISOString(),
            timeZone: 'America/Guayaquil',
          },
          attendees: meeting.participants.map((p) => ({
            email: p.email,
            displayName: p.name,
          })),
        },
      });

      // Guardar el ID del evento en la reunión
      if (event.data.id) {
        await this.prisma.meeting.update({
          where: { id: meeting.id },
          data: { googleCalendarId: event.data.id },
        });
      }

      return event.data.id ?? null;
    } catch (error) {
      this.logger.error(`[GoogleCalendar] Error creando evento: ${error.message}`);
      return null;
    }
  }

  // ── Cancelar evento en Google Calendar ───────────────────────────────────
  async cancelEvent(userId: string, googleCalendarId: string): Promise<void> {
    const auth = await this.getOAuthClient(userId);
    if (!auth) return;

    try {
      const calendar = google.calendar({ version: 'v3', auth });
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: googleCalendarId,
      });
    } catch (error) {
      this.logger.error(`[GoogleCalendar] Error cancelando evento: ${error.message}`);
    }
  }

  // ── Guardar tokens de Calendar (llamado desde el callback OAuth) ──────────
  async saveTokens(
    userId: string,
    accessToken: string,
    refreshToken: string | null,
    expiresAt: Date | null,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        googleCalendarAccessToken: accessToken,
        googleCalendarRefreshToken: refreshToken,
        googleCalendarTokenExpiresAt: expiresAt,
      },
    });
  }
}
