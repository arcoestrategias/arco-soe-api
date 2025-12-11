import { Module } from '@nestjs/common';
import { ModulesController } from './modules.controller';
import { ModulesService } from './modules.service';
import { ModulesRepository } from './repositories/modules.repository';
import { PermissionsModule } from 'src/permissions/permissions.module';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  imports: [PermissionsModule],
  controllers: [ModulesController],
  providers: [ModulesService, ModulesRepository, PrismaService],
  exports: [ModulesService],
})
export class ModulesModule {}
