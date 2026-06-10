import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';

/** Strip URL SSL params — TLS is configured on the Pool with certs/ca.pem. */
function connectionStringWithoutSslParams(raw: string): string {
  const url = new URL(raw);
  for (const key of ['sslmode', 'sslrootcert', 'sslcert', 'sslkey', 'uselibpqcompat']) {
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

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private config: ConfigService) {
    const rawUrl = config.get<string>('DATABASE_URL');
    if (!rawUrl) {
      throw new Error('DATABASE_URL is not set');
    }

    const caPath =
      config.get<string>('DATABASE_CA_PATH') ??
      join(process.cwd(), 'certs', 'ca.pem');

    const pool = new Pool({
      connectionString: connectionStringWithoutSslParams(rawUrl),
      ssl: {
        ca: readFileSync(caPath, 'utf8'),
        rejectUnauthorized: true,
      },
    });

    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
