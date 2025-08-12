import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CoreModule } from './core/core.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { ModulesModule } from './modules/modules.module';
import { CompaniesModule } from './companies/companies.module';
import { BusinessUnitsModule } from './business-unit/business-unit.module';
import { PositionModule } from './position/position.module';
import { StrategicPlanModule } from './strategic-plan/strategic-plan.module';
import { StrategicValueModule } from './strategic-value/strategic-value.module';
import { StrategicSuccessFactorModule } from './strategic-success-factor/strategic-success-factor.module';
import { ObjectiveModule } from './objective/objective.module';
import { IndicatorModule } from './indicator/indicator.module';
import { ObjectiveGoalModule } from './objective-goal/objective-goal.module';
import { IcoModule } from './ico/ico.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CoreModule,
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    ModulesModule,
    CompaniesModule,
    BusinessUnitsModule,
    PositionModule,
    StrategicPlanModule,
    StrategicValueModule,
    StrategicSuccessFactorModule,
    ObjectiveModule,
    IndicatorModule,
    ObjectiveGoalModule,
    IcoModule,
  ],
  controllers: [],
})
export class AppModule {}
