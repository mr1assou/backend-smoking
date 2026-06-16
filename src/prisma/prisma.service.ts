import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Pool, type PoolConfig } from 'pg';

/** Strip URL SSL params — TLS is configured on the Pool with certs/ca.pem. */
function connectionStringWithoutSslParams(raw: string): string {
  const url = new URL(raw);
  for (const key of [
    'sslmode',
    'sslrootcert',
    'sslcert',
    'sslkey',
    'uselibpqcompat',
  ]) {
    url.searchParams.delete(key);
  }
  // UTC via connect string — avoids pool.on('connect') + client.query() (deprecated in pg@9).
  const tzFlag = '-c TimeZone=UTC';
  const options = url.searchParams.get('options');
  if (!options?.includes('TimeZone=')) {
    url.searchParams.set('options', options ? `${options} ${tzFlag}` : tzFlag);
  }
  return url.toString();
}

function isTransientPgError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('connection terminated') ||
    message.includes('econnreset') ||
    message.includes('etimedout') ||
    message.includes('connection closed') ||
    message.includes('server closed the connection')
  );
}

function createPgPool(config: ConfigService): Pool {
  const rawUrl = config.get<string>('DATABASE_URL');
  if (!rawUrl) {
    throw new Error('DATABASE_URL is not set');
  }

  const caPath =
    config.get<string>('DATABASE_CA_PATH') ??
    join(process.cwd(), 'certs', 'ca.pem');

  const poolConfig: PoolConfig = {
    connectionString: connectionStringWithoutSslParams(rawUrl),
    ssl: {
      ca: readFileSync(caPath, 'utf8'),
      rejectUnauthorized: true,
    },
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000,
    // Recycle connections before Aiven/cloud providers drop idle sockets.
    maxLifetimeSeconds: 300,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
  };

  const pool = new Pool(poolConfig);
  const logger = new Logger('PgPool');

  pool.on('error', (error) => {
    logger.error(
      'Idle PostgreSQL client error — connection removed from pool',
      error,
    );
  });

  return pool;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private pool!: Pool;
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: ConfigService) {
    const pool = createPgPool(config);
    const adapter = new PrismaPg(pool);
    const base = new PrismaClient({ adapter });
    const logger = new Logger(PrismaService.name);

    const extended = base.$extends({
      name: 'pg-connection-retry',
      query: {
        $allModels: {
          async $allOperations({ args, query }) {
            try {
              return await query(args);
            } catch (error) {
              if (!isTransientPgError(error)) {
                throw error;
              }

              logger.warn(
                'PostgreSQL connection dropped — retrying query once',
              );
              await base.$disconnect();
              await base.$connect();
              return query(args);
            }
          },
        },
      },
    });

    super({ adapter });

    const service = extended as unknown as PrismaService;
    Object.defineProperty(service, 'pool', { value: pool });

    service.onModuleInit = async () => {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await base.$connect();
          break;
        } catch (error) {
          if (attempt === 3) throw error;
          logger.warn(`PostgreSQL connect failed — retry ${attempt}/2`);
          await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
        }
      }
      await base.$queryRaw`SELECT 1`;
      logger.log('PostgreSQL connection verified');
    };

    service.onModuleDestroy = async () => {
      await base.$disconnect();
      await pool.end();
    };

    return service;
  }

  async onModuleInit() {
    // Replaced on the extended client returned from the constructor.
  }

  async onModuleDestroy() {
    // Replaced on the extended client returned from the constructor.
  }
}
