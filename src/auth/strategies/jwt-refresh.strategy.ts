import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersRepository } from 'src/users/repositories/users.repository';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(private readonly usersRepo: UsersRepository) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_REFRESH_SECRET,
    });
  }

  async validate(payload: { sub: string; iat?: number }) {
    const user = await this.usersRepo.findById(payload.sub);
    if (!user) throw new UnauthorizedException();

    const invalidBefore =
      user.tokenInvalidBeforeAt ?? user.getTokenInvalidBeforeAt?.();
    if (invalidBefore && payload.iat) {
      const iatMs = payload.iat * 1000;
      if (iatMs < new Date(invalidBefore).getTime()) {
        throw new UnauthorizedException('Refresh inválido (logout previo)');
      }
    }
    return { userId: payload.sub };
  }
}
