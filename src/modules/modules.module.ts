import { Module } from '@nestjs/common';
import { ModulesController } from './modules.controller';
import { ModulesService } from './modules.service';
import { ModulesRepository } from './repositories/modules.repository';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [ModulesController],
  providers: [ModulesService, ModulesRepository, PrismaService],
  exports: [ModulesService],
})
export class ModulesModule {}
