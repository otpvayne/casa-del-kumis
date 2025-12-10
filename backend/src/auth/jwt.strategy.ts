// backend/src/auth/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { Rol } from '@prisma/client';

export interface JwtPayload {
  sub: number; // id del usuario
  email: string;
  rol: Rol;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    // Tipamos la función que extrae el JWT del header
    const jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken() as (
      req: Request,
    ) => string | null;

    super({
      jwtFromRequest,
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'dev_secret_kumis',
    });
  }

  // No hace falta que sea async si no hay await
  validate(payload: JwtPayload): JwtPayload {
    // Esto es lo que termina en req.user
    return payload;
  }
}
