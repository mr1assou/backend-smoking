import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool, PoolConfig } from "pg";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private config: ConfigService) {
    const connectionString = config.get<string>('DATABASE_URL');
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set');
    }

    const sslCa = config.get<string>('DATABASE_SSL_CA')?.trim();
    const rejectUnauthorizedRaw = config.get<string>('DATABASE_SSL_REJECT_UNAUTHORIZED')?.trim().toLowerCase();
    const skipTlsVerify =
      rejectUnauthorizedRaw === 'false' || rejectUnauthorizedRaw === '0' || rejectUnauthorizedRaw === 'no';

    const poolConfig: PoolConfig = { connectionString };

    if (sslCa) {
      const caPath = path.isAbsolute(sslCa) ? sslCa : path.join(process.cwd(), sslCa);
      poolConfig.ssl = {
        rejectUnauthorized: true,
        ca: fs.readFileSync(caPath, 'utf-8'),
      };
    } else if (skipTlsVerify) {
      // Aiven / some cloud Postgres from Render: TLS works but Node does not trust the chain (P1011).
      // Set DATABASE_SSL_REJECT_UNAUTHORIZED=false on Render. Prefer DATABASE_SSL_CA when you can.
      poolConfig.ssl = { rejectUnauthorized: false };
    }

    const pool = new Pool(poolConfig);
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
