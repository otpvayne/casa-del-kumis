import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'casa-del-kumis-dev-secret',
    });
  }

  async validate(payload: any) {
    // Esto es lo que Nest inyecta como req.user
    return {
      userId: payload.sub,
      email: payload.email,
      rol: payload.rol,
    };
  }
}
