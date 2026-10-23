import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import {
  ExtractJwt,
  Strategy,
  type StrategyOptionsWithRequest,
} from 'passport-jwt';

/** Cookie (web) or Bearer / JSON body (mobile). */
function refreshTokenFromRequest(req: Request): string | null {
  const cookie: unknown = req.cookies?.['refresh_token'];
  if (typeof cookie === 'string' && cookie.length > 0) return cookie;

  const auth = req.headers?.authorization;
  if (typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
    const token = auth.slice(7).trim();
    if (token) return token;
  }

  const body = req.body as { refreshToken?: unknown } | undefined;
  if (typeof body?.refreshToken === 'string' && body.refreshToken.length > 0) {
    return body.refreshToken;
  }

  return null;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(config: ConfigService) {
    const options: StrategyOptionsWithRequest = {
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => refreshTokenFromRequest(req),
      ]),
      secretOrKey: config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    };
    super(options);
  }

  validate(req: Request, payload: { sub: number; email: string }) {
    const refreshToken = refreshTokenFromRequest(req);
    if (!refreshToken) {
      return null;
    }
    return { userId: payload.sub, email: payload.email, refreshToken };
  }
}
