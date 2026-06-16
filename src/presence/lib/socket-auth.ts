import { JwtService } from '@nestjs/jwt';
import type { Socket } from 'socket.io';
import type { PresenceSocketUser } from '../types/presence.types';

type JwtPayload = { sub: number; email: string };

type SocketData = {
  user?: PresenceSocketUser;
};

type SocketDataCarrier = {
  data: unknown;
};

function socketData(client: SocketDataCarrier): SocketData {
  return client.data as SocketData;
}

export function getSocketUser(
  client: SocketDataCarrier,
): PresenceSocketUser | undefined {
  return socketData(client).user;
}

export function setSocketUser(client: Socket, user: PresenceSocketUser): void {
  socketData(client).user = user;
}

export function extractSocketToken(client: Socket): string | undefined {
  const authToken: unknown = client.handshake.auth?.token;
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
