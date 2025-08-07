import { forwardRef, Module } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { CompaniesRepository } from './repositories/companies.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersModule } from 'src/users/users.module';
import { PositionModule } from 'src/position/position.module';

@Module({
  imports: [forwardRef(() => UsersModule), PositionModule],
  controllers: [CompaniesController],
  providers: [CompaniesService, CompaniesRepository, PrismaService],
  exports: [CompaniesService, CompaniesRepository],
})
export class CompaniesModule {}
