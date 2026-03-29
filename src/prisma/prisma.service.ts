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

    const sslCa = config.get<string>('DATABASE_SSL_CA');
    const poolConfig: PoolConfig = { connectionString };
    if (sslCa?.trim()) {
      const caPath = path.isAbsolute(sslCa) ? sslCa : path.join(process.cwd(), sslCa);
      poolConfig.ssl = {
        rejectUnauthorized: true,
        ca: fs.readFileSync(caPath, 'utf-8'),
      };
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
