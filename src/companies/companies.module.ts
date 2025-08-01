import { Module } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { CompaniesRepository } from './repositories/companies.repository';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [CompaniesController],
  providers: [CompaniesService, CompaniesRepository, PrismaService],
  exports: [CompaniesService],
})
export class CompaniesModule {}
