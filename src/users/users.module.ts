import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UsersRepository } from './repositories/users.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { BusinessUnitsModule } from 'src/business-unit/business-unit.module';
import { CompaniesModule } from 'src/companies/companies.module';

@Module({
  imports: [BusinessUnitsModule, CompaniesModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository, PrismaService],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
