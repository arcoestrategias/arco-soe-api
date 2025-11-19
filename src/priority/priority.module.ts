import { forwardRef, Module } from '@nestjs/common';
import { PriorityService } from './priority.service';
import { PriorityController } from './priority.controller';
import { PriorityRepository } from './repositories/priority.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [NotificationsModule, forwardRef(() => UsersModule)],
  controllers: [PriorityController],
  providers: [PriorityService, PriorityRepository, PrismaService],
  exports: [PriorityService],
})
export class PriorityModule {}
