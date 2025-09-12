import { Module } from '@nestjs/common';
import { IcoService } from './ico.service';
import { IcoController } from './ico.controller';
import { IcoRepository } from './repositories/ico.repository';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [IcoController],
  providers: [IcoService, IcoRepository, PrismaService],
  exports: [IcoService],
})
export class IcoModule {}
