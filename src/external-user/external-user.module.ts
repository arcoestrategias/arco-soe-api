import { Module, forwardRef } from '@nestjs/common';
import { ExternalUserService } from './external-user.service';
import { ExternalUserController } from './external-user.controller';
import { ExternalUserRepository } from './repositories/external-user.repository';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [ExternalUserController],
  providers: [ExternalUserService, ExternalUserRepository, PrismaService],
  exports: [ExternalUserRepository, ExternalUserService],
})
export class ExternalUserModule {}
