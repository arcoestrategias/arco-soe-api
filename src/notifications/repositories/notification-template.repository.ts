import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class NotificationTemplateRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByCode(code: string) {
    return this.prisma.notificationTemplate.findFirst({
      where: { codeTemplate: code, isActive: true },
    });
  }

  // opcional: CRUD completo si quieres administrar plantillas
}
