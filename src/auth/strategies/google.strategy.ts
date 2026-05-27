import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { StrategyOptions } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private configService: ConfigService) {
    const options: StrategyOptions = {
      clientID: configService.get('GOOGLE_CLIENT_ID') as string,
      clientSecret: configService.get('GOOGLE_CLIENT_SECRET') as string,
      callbackURL: configService.get('GOOGLE_CALLBACK_URL') as string,
      scope: ['email', 'profile'],
      passReqToCallback: false,
    };
    super(options);
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
  ): Promise<any> {
    return {
      googleId: profile.id,
      email: profile.emails[0].value,
      firstName: profile.name.givenName,
      lastName: profile.name.familyName,
    };
  }
}