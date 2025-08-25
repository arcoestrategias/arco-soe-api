import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { FilesRepository } from './repositories/files.repository';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [FilesController],
  providers: [FilesService, FilesRepository, PrismaService],
  exports: [FilesService],
})
export class FilesModule {}
