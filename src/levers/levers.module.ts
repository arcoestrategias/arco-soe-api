import { Module } from '@nestjs/common';
import { LeversService } from './levers.service';
import { LeversController } from './levers.controller';
import { LeversRepository } from './repositories/levers.repository';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [LeversController],
  providers: [LeversService, LeversRepository, PrismaService],
  exports: [LeversService],
})
export class LeversModule {}
