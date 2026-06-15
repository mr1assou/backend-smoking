import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const url = this.resolveRedisUrl();
    this.client = new Redis(url, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });

    await this.client.connect();
    await this.client.ping();
    this.logger.log(`Connected to Redis at ${url}`);
  }

  async onModuleDestroy() {
    if (!this.client) return;
    await this.client.quit();
    this.client = null;
  }

  /** Raw ioredis client — inject RedisService where caching/pub-sub is needed later. */
  getClient(): Redis {
    if (!this.client) {
      throw new Error('Redis client is not initialized');
    }
    return this.client;
  }

  private resolveRedisUrl(): string {
    const url = this.config.get<string>('REDIS_URL');
    if (url) return url;

    const host = this.config.get<string>('REDIS_HOST', '127.0.0.1');
    const port = this.config.get<number>('REDIS_PORT', 6379);
    return `redis://${host}:${port}`;
  }
}
