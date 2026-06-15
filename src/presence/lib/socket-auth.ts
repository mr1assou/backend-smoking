import { JwtService } from '@nestjs/jwt';
import type { Socket } from 'socket.io';
import type { PresenceSocketUser } from '../types/presence.types';

type JwtPayload = { sub: number; email: string };

export function extractSocketToken(client: Socket): string | undefined {
  const authToken = client.handshake.auth?.token;
  if (typeof authToken === 'string' && authToken.trim()) {
    return authToken.trim();
  }

  const header = client.handshake.headers.authorization;
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    return header.slice('Bearer '.length).trim();
  }

  return undefined;
}

export function verifyPresenceSocketUser(
  client: Socket,
  jwt: JwtService,
  jwtSecret: string | undefined,
): PresenceSocketUser | null {
  const token = extractSocketToken(client);
  if (!token || !jwtSecret) return null;

  try {
    const payload = jwt.verify<JwtPayload>(token, { secret: jwtSecret });
    if (!payload?.sub) return null;
    return { userId: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}
