import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UsersRepository } from './repositories/users.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { BusinessUnitsModule } from 'src/business-unit/business-unit.module';
import { CompaniesModule } from 'src/companies/companies.module';
import { RolesModule } from 'src/roles/roles.module';
import { UserAssignmentRepository } from './repositories/user-assignment.repository';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [
    BusinessUnitsModule,
    CompaniesModule,
    RolesModule,
    NotificationsModule,
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    UsersRepository,
    UserAssignmentRepository,
    PrismaService,
  ],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
