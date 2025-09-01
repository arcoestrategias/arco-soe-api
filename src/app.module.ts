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
import { StrategicProjectModule } from './strategic-project/strategic-project.module';
import { ProjectFactorModule } from './project-factor/project-factor.module';
import { ProjectTaskModule } from './project-task/project-task.module';
import { ProjectParticipantModule } from './project-participant/project-participant.module';
import { PriorityModule } from './priority/priority.module';
import { FilesModule } from './files/files.module';
import { MailModule } from './mail/mail.module';
import { NotificationsModule } from './notifications/notifications.module';
import { LeversModule } from './levers/levers.module';

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
    StrategicProjectModule,
    ProjectFactorModule,
    ProjectTaskModule,
    ProjectParticipantModule,
    PriorityModule,
    FilesModule,
    MailModule,
    NotificationsModule,
    LeversModule,
  ],
  controllers: [],
})
export class AppModule {}
