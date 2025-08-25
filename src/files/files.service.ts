import { Injectable, NotFoundException } from '@nestjs/common';
import { FilesRepository } from './repositories/files.repository';
import { FileEntity } from './entities/file.entity';
import * as fs from 'fs';
import * as path from 'path';
import { uploadBaseDir } from './../common/utils/storage.util';

type SaveArgs = {
  type: 'logo' | 'document';
  referenceId: string;
  userId: string;
  file: Express.Multer.File; // ya guardado por Multer con nombre temporal
  description?: string | null;
  unique?: boolean; // true para logo (reemplaza)
};

@Injectable()
export class FilesService {
  constructor(private readonly repo: FilesRepository) {}

  async saveOne(args: SaveArgs): Promise<FileEntity> {
    const { type, referenceId, userId, file, description, unique } = args;

    if (unique) {
      await this.repo.inactivateByRef(null, referenceId, type, userId); // moduleShortcode=null
    }

    const ext = (path.extname(file.originalname) || '')
      .replace('.', '')
      .toLowerCase();
    const baseDir = uploadBaseDir(type);
    const tmpPath = file.path; // lo puso multer
    const destDir = baseDir; // ya separado por tipo

    // 1) crea registro para obtener ID
    const created = await this.repo.create(
      {
        fieldName: file.fieldname,
        description: description ?? null,
        originalName: file.originalname,
        encoding: file.encoding,
        mimeType: file.mimetype,
        destination: destDir,
        fileName: '', // seteamos luego
        path: '', // seteamos luego
        sizeByte: Number(file.size),
        extension: ext,
        icon: null,
        moduleShortcode: null, // simplificado
        referenceId,
        screenKey: type,
      },
      userId,
    );

    // 2) renombrar en disco: <id>.<ext>
    const finalName = `${created.id}.${ext}`;
    const finalPath = path.join(destDir, finalName);
    await fs.promises.rename(tmpPath, finalPath);

    // 3) actualizar fileName/path en BD
    const updated = await this.repo.updateNames(
      created.id,
      finalName,
      finalPath,
      userId,
    );
    return updated;
  }

  async list(
    type: 'logo' | 'document',
    referenceId: string,
  ): Promise<FileEntity[]> {
    return this.repo.listByRef(null, referenceId, type);
  }

  async findById(id: string): Promise<FileEntity> {
    const f = await this.repo.findById(id);
    if (!f) throw new NotFoundException('Archivo no encontrado');
    return f;
  }
}
