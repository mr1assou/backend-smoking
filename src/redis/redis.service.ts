import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { resolveRedisConnectionOptions } from './redis-connection.config';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const options = resolveRedisConnectionOptions(this.config);
    this.client = new Redis({
      ...options,
      lazyConnect: true,
    });

    await this.client.connect();
    await this.client.ping();
    this.logger.log('Connected to Redis');
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
}
