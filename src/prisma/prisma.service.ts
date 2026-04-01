import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool, PoolConfig } from 'pg';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

/** Stops URL params from forcing TLS verify paths that ignore Pool.ssl.rejectUnauthorized (P1011 on Render→Aiven). */
function postgresUrlWithoutSslMode(connectionString: string): string {
  try {
    const u = new URL(connectionString.replace(/^postgresql:/i, 'https:'));
    u.searchParams.delete('sslmode');
    u.searchParams.delete('uselibpqcompat');
    let out = u.toString().replace(/^https:/i, 'postgresql:');
    out = out.replace(/\?$/, '');
    return out;
  } catch {
    return connectionString;
  }
}

function tlsVerifyDisabledExplicit(): boolean {
  const raw =
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED?.trim().toLowerCase() ?? '';
  return raw === 'false' || raw === '0' || raw === 'no';
}

/** Works for `nest start` (src/...) and `node dist/main` (dist/src/...): cwd on Render is not always the repo root. */
function findPackageRoot(startDir: string): string {
  let dir = startDir;
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  return process.cwd();
}

function loadCaPem(sslCaConfig: string): { pem: string; source: string } {
  const trimmed = sslCaConfig.trim();
  if (trimmed.includes('-----BEGIN')) {
    return {
      pem: trimmed.replace(/\\n/g, '\n'),
      source: 'DATABASE_SSL_CA (inline PEM)',
    };
  }
  const root = findPackageRoot(__dirname);
  const candidates = [
    path.isAbsolute(trimmed) ? trimmed : path.join(process.cwd(), trimmed),
    path.join(root, trimmed),
  ];
  for (const caPath of candidates) {
    if (fs.existsSync(caPath)) {
      return { pem: fs.readFileSync(caPath, 'utf-8'), source: caPath };
    }
  }
  throw new Error(
    `DATABASE_SSL_CA file not found. Tried: ${candidates.join(', ')} (cwd=${process.cwd()})`,
  );
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  /** Same pool as PrismaPg — use for raw SELECTs where $queryRawUnsafe hits adapter/engine error-mapping bugs. */
  private readonly driverPool: Pool;

  constructor(private config: ConfigService) {
    const connectionString =
      config.get<string>('DATABASE_URL')?.trim() ||
      process.env.DATABASE_URL?.trim();
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set');
    }

    const sslCa =
      config.get<string>('DATABASE_SSL_CA')?.trim() ||
      process.env.DATABASE_SSL_CA?.trim();

    const isAivenHost = /\.aivencloud\.com/i.test(connectionString);
    const skipTlsVerify =
      !sslCa && (tlsVerifyDisabledExplicit() || isAivenHost);

    const poolConfig: PoolConfig = {};

    if (sslCa) {
      const { pem, source } = loadCaPem(sslCa);
      // URL sslmode/uselibpqcompat can still force a TLS path that ignores Pool.ssl.ca → P1011; strip like the insecure branch.
      poolConfig.connectionString = postgresUrlWithoutSslMode(connectionString);
      poolConfig.ssl = {
        rejectUnauthorized: true,
        ca: pem,
      };
      if (process.env.NODE_ENV !== 'test') {
        console.warn(
          `[PrismaService] Postgres TLS: CA from ${source} (${pem.length} chars)`,
        );
      }
    } else if (skipTlsVerify) {
      poolConfig.connectionString = postgresUrlWithoutSslMode(connectionString);
      poolConfig.ssl = { rejectUnauthorized: false };
      if (process.env.NODE_ENV !== 'test') {
        console.warn(
          '[PrismaService] Postgres TLS: rejectUnauthorized=false' +
            (isAivenHost
              ? ' (Aiven host detected)'
              : ' (DATABASE_SSL_REJECT_UNAUTHORIZED)') +
            '. Use DATABASE_SSL_CA for full verification when possible.',
        );
      }
    } else {
      poolConfig.connectionString = connectionString;
    }

    const pool = new Pool(poolConfig);
    super({ adapter: new PrismaPg(pool) });
    this.driverPool = pool;
  }

  /**
   * Run a read-only SELECT already validated by the app (e.g. AI SQL guard).
   * Prefer this over $queryRawUnsafe for generated SQL: pg returns clear errors (e.g. invalid uuid),
   * avoiding Prisma adapter `InvalidInputValue` deserialization issues.
   */
  async queryReadOnlySql(sql: string): Promise<Record<string, unknown>[]> {
    const res = await this.driverPool.query(sql);
    return res.rows as Record<string, unknown>[];
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
