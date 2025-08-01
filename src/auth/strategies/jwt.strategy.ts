import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersRepository } from 'src/users/repositories/users.repository';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly usersRepo: UsersRepository) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  /**
   * Este método se ejecuta automáticamente cuando un token JWT válido es recibido.
   * El objeto `payload` contiene lo que fue firmado al generar el token (normalmente { sub: user.id }).
   *
   * Lo que se retorne aquí estará disponible como `req.user` en todos los endpoints protegidos.
   */
  async validate(payload: { sub: string }) {
    const user = await this.usersRepo.findById(payload.sub);
    if (!user) throw new UnauthorizedException();

    // Solo retornamos el ID como `sub`, que es el identificador estándar JWT.
    return { sub: user.id };
  }
}
