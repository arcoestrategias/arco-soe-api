import { Module } from '@nestjs/common';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import { PermissionsRepository } from './repositories/permissions.repository';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [PermissionsController],
  providers: [PermissionsService, PermissionsRepository, PrismaService],
  exports: [PermissionsService, PermissionsRepository],
})
export class PermissionsModule {}
