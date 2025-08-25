import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { FileEntity } from '../entities/file.entity';

@Injectable()
export class FilesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: any, userId: string): Promise<FileEntity> {
    const created = await this.prisma.file.create({
      data: { ...data, createdBy: userId },
    });
    return new FileEntity(created);
  }

  async updateNames(
    id: string,
    fileName: string,
    filePath: string,
    userId: string,
  ): Promise<FileEntity> {
    const row = await this.prisma.file.update({
      where: { id },
      data: { fileName, path: filePath, updatedBy: userId },
    });
    return new FileEntity(row);
  }

  async findById(id: string): Promise<FileEntity | null> {
    const found = await this.prisma.file.findFirst({
      where: { id, isActive: true },
    });
    return found ? new FileEntity(found) : null;
  }

  async listByRef(
    moduleShortcode: string | null,
    referenceId: string,
    screenKey?: string,
  ) {
    const where: any = { isActive: true, referenceId };
    if (moduleShortcode !== undefined) where.moduleShortcode = moduleShortcode; // null explícito
    if (screenKey) where.screenKey = screenKey;

    const rows = await this.prisma.file.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });
    return rows.map((r) => new FileEntity(r));
  }

  async inactivateByRef(
    moduleShortcode: string | null,
    referenceId: string,
    screenKey: string,
    userId: string,
  ) {
    await this.prisma.file.updateMany({
      where: { isActive: true, referenceId, screenKey, moduleShortcode },
      data: { isActive: false, updatedBy: userId },
    });
  }
}
