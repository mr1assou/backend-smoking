import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import {
  ExtractJwt,
  Strategy,
  type StrategyOptionsWithRequest,
} from 'passport-jwt';

function refreshTokenFromCookie(req: Request): string | null {
  const token: unknown = req.cookies?.['refresh_token'];
  return typeof token === 'string' ? token : null;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(config: ConfigService) {
    const options: StrategyOptionsWithRequest = {
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => refreshTokenFromCookie(req),
      ]),
      secretOrKey: config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    };
    super(options);
  }

  validate(req: Request, payload: { sub: number; email: string }) {
    const refreshToken = refreshTokenFromCookie(req);
    if (!refreshToken) {
      return null;
    }
    return { userId: payload.sub, email: payload.email, refreshToken };
  }
}
