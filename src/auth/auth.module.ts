import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { GoogleController } from './google.controller'; // Nuevo
import { TermsController } from './terms.controller';
import { TermsService } from './terms.service';
import { GoogleStrategy } from './strategies/google.strategy'; // Nuevo
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { UsersModule } from 'src/users/users.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfigModule } from '@nestjs/config'; // Para GoogleStrategy

@Module({
  imports: [
    UsersModule,
    JwtModule.register({}),
    NotificationsModule,
    ConfigModule, // Para GoogleStrategy
  ],
  providers: [
    AuthService,
    TermsService,
    JwtStrategy,
    JwtRefreshStrategy,
    GoogleStrategy, // Nuevo
    PrismaService,
  ],
  controllers: [
    AuthController,
    TermsController,
    GoogleController, // Nuevo
  ],
  exports: [TermsService],
})
export class AuthModule {}
