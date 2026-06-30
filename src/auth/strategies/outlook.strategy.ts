import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-microsoft';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OutlookStrategy extends PassportStrategy(Strategy, 'microsoft') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('OUTLOOK_CLIENT_ID') as string,
      clientSecret: configService.get<string>(
        'OUTLOOK_CLIENT_SECRET',
      ) as string,
      callbackURL: configService.get<string>('OUTLOOK_CALLBACK_URL') as string,
      tenant: configService.get<string>('OUTLOOK_TENANT_ID') as string,
      scope: ['user.read', 'email', 'profile', 'openid'],
      passReqToCallback: false,
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
  ): Promise<any> {
    return {
      outlookId: profile.id,
      email:
        profile.emails?.[0]?.value ??
        profile._json?.mail ??
        profile._json?.userPrincipalName,
      firstName: profile.name?.givenName ?? profile._json?.givenName ?? '',
      lastName: profile.name?.familyName ?? profile._json?.surname ?? '',
    };
  }
}
