import { forwardRef, Module } from '@nestjs/common';
import { BusinessUnitsRepository } from './repositories/business-units.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { BusinessUnitsController } from './business-unit.controller';
import { BusinessUnitsService } from './business-unit.service';
import { PermissionsModule } from 'src/permissions/permissions.module';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [PermissionsModule, forwardRef(() => UsersModule)],
  controllers: [BusinessUnitsController],
  providers: [BusinessUnitsService, BusinessUnitsRepository, PrismaService],
  exports: [BusinessUnitsService, BusinessUnitsRepository],
})
export class BusinessUnitsModule {}
