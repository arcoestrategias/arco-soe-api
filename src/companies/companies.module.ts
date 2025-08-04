import { forwardRef, Module } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { CompaniesRepository } from './repositories/companies.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [forwardRef(() => UsersModule)],
  controllers: [CompaniesController],
  providers: [CompaniesService, CompaniesRepository, PrismaService],
  exports: [CompaniesService, CompaniesRepository],
})
export class CompaniesModule {}
