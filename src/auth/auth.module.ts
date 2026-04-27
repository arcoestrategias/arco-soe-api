import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TermsController } from './terms.controller';
import { TermsService } from './terms.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { UsersModule } from 'src/users/users.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  imports: [UsersModule, JwtModule.register({}), NotificationsModule],
  providers: [
    AuthService,
    TermsService,
    JwtStrategy,
    JwtRefreshStrategy,
    PrismaService,
  ],
  controllers: [AuthController, TermsController],
  exports: [TermsService],
})
export class AuthModule {}
