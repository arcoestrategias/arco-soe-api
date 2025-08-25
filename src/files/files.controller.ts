import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Req,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import { FilesService } from './files.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/core/guards/permissions.guard';
import {
  MAX_DOC_SIZE,
  MAX_LOGO_SIZE,
  DOC_MIME_REGEX,
  IMAGE_MIME_REGEX,
} from 'src/common/constants/file.constants';
import {
  ensureDir,
  uploadBaseDir,
  getExt,
  buildPublicUrl,
} from 'src/common/utils/storage.util';
import { Request as ExpressRequest } from 'express';
import { FileEntity } from './entities/file.entity';
import { UserId } from 'src/common/decorators/user-id.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  // SUBIR (logo o documentos). Único endpoint.
  // POST /files?type=logo|document&referenceId=<UUID>&description=...
  @Post()
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: diskStorage({
        destination: (req, _file, cb) => {
          const type =
            (req.query.type as string) === 'logo' ? 'logo' : 'document';
          const dest = uploadBaseDir(type);
          ensureDir(dest);
          cb(null, dest);
        },
        // nombre temporal; luego renombramos a <id>.<ext>
        filename: (_req, file, cb) =>
          cb(
            null,
            `tmp-${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`,
          ),
      }),
      limits: { fileSize: MAX_DOC_SIZE }, // el de documentos; para logo validamos manualmente
    }),
  )
  async upload(
    @Query('type') type: 'logo' | 'document',
    @Query('referenceId') referenceId: string,
    @Query('description') description: string | undefined,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: ExpressRequest,
    @UserId() userId: string,
  ) {
    if (!type || !['logo', 'document'].includes(type))
      throw new BadRequestException('type must be logo|document');
    if (!referenceId) throw new BadRequestException('referenceId is required');
    if (!files?.length) throw new BadRequestException('No files uploaded');

    // validaciones mínimas
    if (type === 'logo') {
      const f = files[0];
      if (f.size > MAX_LOGO_SIZE)
        throw new BadRequestException('Logo too large');
      if (!IMAGE_MIME_REGEX.test(f.mimetype))
        throw new BadRequestException(`Tipo inválido para logo: ${f.mimetype}`);
      // guarda único (reemplaza)
      const saved = await this.filesService.saveOne({
        type,
        referenceId,
        userId,
        file: f,
        description: description ?? null,
        unique: true,
      });
      const url = buildPublicUrl(
        req,
        'logo',
        saved.id,
        saved.extension || getExt(saved.originalName || ''),
      );
      return { success: true, publicUrl: url };
    }

    // documentos (multi) con fallback por extensión si octet-stream
    const savedItems: FileEntity[] = [];
    for (const f of files) {
      if (f.size > MAX_DOC_SIZE)
        throw new BadRequestException(`Archivo muy grande: ${f.originalname}`);
      const okByMime = DOC_MIME_REGEX.test(f.mimetype);
      const isOctet = f.mimetype === 'application/octet-stream';
      const okByExt = ['pdf', 'doc', 'docx', 'xls', 'xlsx'].includes(
        getExt(f.originalname),
      );
      if (!(okByMime || (isOctet && okByExt))) {
        throw new BadRequestException(
          `Tipo inválido: ${f.originalname} (${f.mimetype})`,
        );
      }
      const saved: FileEntity = await this.filesService.saveOne({
        type,
        referenceId,
        userId: (req as any).user.id,
        file: f,
        description: description ?? null,
      });
      savedItems.push(saved);
    }

    // respuesta: ordenado por fecha desc + campos requested
    const items = savedItems
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .map((i) => ({
        publicUrl: buildPublicUrl(
          req,
          'document',
          i.id,
          i.extension || getExt(i.originalName || ''),
        ),
        originalName: i.originalName,
        description: i.description,
        createdAt: i.createdAt,
      }));

    return { success: true, items };
  }

  // LISTAR (logo o documentos)
  // GET /files?type=logo|document&referenceId=<UUID>
  @Get()
  async list(
    @Query('type') type: 'logo' | 'document',
    @Query('referenceId') referenceId: string,
    @Req() req: ExpressRequest,
  ) {
    if (!type || !['logo', 'document'].includes(type))
      throw new BadRequestException('type must be logo|document');
    if (!referenceId) throw new BadRequestException('referenceId is required');

    const rows = await this.filesService.list(type, referenceId);

    if (type === 'logo') {
      const latest = rows[0];
      return {
        success: true,
        publicUrl: latest
          ? buildPublicUrl(
              req,
              'logo',
              latest.id,
              latest.extension || getExt(latest.originalName || ''),
            )
          : null,
      };
    }

    // documents
    const items = rows.map((r) => ({
      publicUrl: buildPublicUrl(
        req,
        'document',
        r.id,
        r.extension || getExt(r.originalName || ''),
      ),
      originalName: r.originalName,
      description: r.description,
      createdAt: r.createdAt,
    }));
    return { success: true, items };
  }
}
