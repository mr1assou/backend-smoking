import type { ConfigService } from '@nestjs/config';
import type { RedisOptions } from 'ioredis';

/** Shared Redis connection options for ioredis / BullMQ. */
export function resolveRedisConnectionOptions(
  config: ConfigService,
): RedisOptions {
  const url = config.get<string>('REDIS_URL')?.trim();
  if (url) {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : 6379,
      username: parsed.username || undefined,
      password: parsed.password || undefined,
      maxRetriesPerRequest: null,
      tls: parsed.protocol === 'rediss:' ? {} : undefined,
    };
  }

  return {
    host: config.get<string>('REDIS_HOST', '127.0.0.1'),
    port: config.get<number>('REDIS_PORT', 6379),
    maxRetriesPerRequest: null,
  };
}
