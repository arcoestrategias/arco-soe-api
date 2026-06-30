import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import 'isomorphic-fetch';
import { Client } from '@microsoft/microsoft-graph-client';

@Injectable()
export class OutlookCalendarService {
  private readonly logger = new Logger(OutlookCalendarService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Crear cliente Graph para un usuario ───────────────────────────────────
  private async getGraphClient(userId: string): Promise<Client | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        outlookCalendarAccessToken: true,
        outlookCalendarRefreshToken: true,
        outlookCalendarTokenExpiresAt: true,
      },
    });

    if (!user?.outlookCalendarAccessToken) return null;

    const accessToken = await this.getValidAccessToken(userId, user);
    if (!accessToken) return null;

    return Client.init({
      authProvider: (done) => done(null, accessToken),
    });
  }

  // ── Refrescar token si está expirado ─────────────────────────────────────
  private async getValidAccessToken(userId: string, user: any): Promise<string | null> {
    const now = new Date();
    const expiresAt = user.outlookCalendarTokenExpiresAt;

    // Si no está expirado, usar el actual
    if (expiresAt && new Date(expiresAt) > now) {
      return user.outlookCalendarAccessToken;
    }

    // Refrescar con refresh token
    if (!user.outlookCalendarRefreshToken) return null;

    try {
      const response = await fetch(
        `https://login.microsoftonline.com/${process.env.OUTLOOK_TENANT_ID}/oauth2/v2.0/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.OUTLOOK_CLIENT_ID!,
            client_secret: process.env.OUTLOOK_CLIENT_SECRET!,
            refresh_token: user.outlookCalendarRefreshToken,
            grant_type: 'refresh_token',
            scope: 'Calendars.ReadWrite offline_access',
          }),
        },
      );

      const data = await response.json();
      if (!data.access_token) return null;

      const newExpiresAt = new Date(Date.now() + data.expires_in * 1000);

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          outlookCalendarAccessToken: data.access_token,
          outlookCalendarRefreshToken: data.refresh_token ?? user.outlookCalendarRefreshToken,
          outlookCalendarTokenExpiresAt: newExpiresAt,
        },
      });

      return data.access_token;
    } catch (error) {
      this.logger.error(`[OutlookCalendar] Error refrescando token: ${(error as any).message}`);
      return null;
    }
  }

  // ── Verificar si el usuario tiene calendario conectado ────────────────────
  async isConnected(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { outlookCalendarAccessToken: true },
    });
    return !!user?.outlookCalendarAccessToken;
  }

  // ── Desconectar calendario ────────────────────────────────────────────────
  async disconnect(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        outlookCalendarAccessToken: null,
        outlookCalendarRefreshToken: null,
        outlookCalendarTokenExpiresAt: null,
      },
    });
  }

  // ── Guardar tokens ────────────────────────────────────────────────────────
  async saveTokens(
    userId: string,
    accessToken: string,
    refreshToken: string | null,
    expiresAt: Date | null,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        outlookCalendarAccessToken: accessToken,
        outlookCalendarRefreshToken: refreshToken,
        outlookCalendarTokenExpiresAt: expiresAt,
      },
    });
  }

  // ── Crear evento en Outlook Calendar ─────────────────────────────────────
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
    const client = await this.getGraphClient(userId);
    if (!client) return null;

    try {
      const event = await client.api('/me/events').post({
        subject: meeting.name,
        body: {
          contentType: 'Text',
          content: meeting.purpose ?? '',
        },
        location: meeting.location ? { displayName: meeting.location } : undefined,
        start: {
          dateTime: meeting.startDate.toISOString(),
          timeZone: 'America/Guayaquil',
        },
        end: {
          dateTime: meeting.endDate.toISOString(),
          timeZone: 'America/Guayaquil',
        },
        attendees: meeting.participants.map((p) => ({
          emailAddress: { address: p.email, name: p.name },
          type: 'required',
        })),
      });

      // Guardar el ID del evento en la reunión
      if (event.id) {
        await this.prisma.meeting.update({
          where: { id: meeting.id },
          data: { outlookCalendarId: event.id },
        });
      }

      console.log('[OutlookCalendar] Evento creado:', event.id);
      return event.id ?? null;
    } catch (error) {
      this.logger.error(`[OutlookCalendar] Error creando evento: ${(error as any).message}`);
      return null;
    }
  }

  // ── Actualizar evento en Outlook Calendar ─────────────────────────────────
  async updateEvent(
    userId: string,
    outlookCalendarId: string,
    meeting: {
      name: string;
      purpose?: string | null;
      location?: string | null;
      startDate: Date;
      endDate: Date;
      participants: { email: string; name: string }[];
    },
  ): Promise<void> {
    const client = await this.getGraphClient(userId);
    if (!client) return;

    try {
      await client.api(`/me/events/${outlookCalendarId}`).patch({
        subject: meeting.name,
        body: {
          contentType: 'Text',
          content: meeting.purpose ?? '',
        },
        location: meeting.location ? { displayName: meeting.location } : undefined,
        start: {
          dateTime: meeting.startDate.toISOString(),
          timeZone: 'America/Guayaquil',
        },
        end: {
          dateTime: meeting.endDate.toISOString(),
          timeZone: 'America/Guayaquil',
        },
        attendees: meeting.participants.map((p) => ({
          emailAddress: { address: p.email, name: p.name },
          type: 'required',
        })),
      });

      console.log('[OutlookCalendar] Evento actualizado:', outlookCalendarId);
    } catch (error) {
      this.logger.error(`[OutlookCalendar] Error actualizando evento: ${(error as any).message}`);
    }
  }

  // ── Cancelar evento en Outlook Calendar ───────────────────────────────────
  async cancelEvent(userId: string, outlookCalendarId: string): Promise<void> {
    const client = await this.getGraphClient(userId);
    if (!client) return;

    try {
      await client.api(`/me/events/${outlookCalendarId}`).delete();
      console.log('[OutlookCalendar] Evento cancelado:', outlookCalendarId);
    } catch (error) {
      this.logger.error(`[OutlookCalendar] Error cancelando evento: ${(error as any).message}`);
    }
  }
}
