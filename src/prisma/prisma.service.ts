import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool, PoolConfig } from "pg";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs";
import * as path from "path";

/** Stops URL params from forcing TLS verify paths that ignore Pool.ssl.rejectUnauthorized (P1011 on Render→Aiven). */
function postgresUrlWithoutSslMode(connectionString: string): string {
  try {
    const u = new URL(connectionString.replace(/^postgresql:/i, "https:"));
    u.searchParams.delete("sslmode");
    u.searchParams.delete("uselibpqcompat");
    let out = u.toString().replace(/^https:/i, "postgresql:");
    out = out.replace(/\?$/, "");
    return out;
  } catch {
    return connectionString;
  }
}

function tlsVerifyDisabledExplicit(): boolean {
  const raw =
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED?.trim().toLowerCase() ??
    "";
  return raw === "false" || raw === "0" || raw === "no";
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private config: ConfigService) {
    const connectionString =
      config.get<string>("DATABASE_URL")?.trim() || process.env.DATABASE_URL?.trim();
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }

    const sslCa =
      config.get<string>("DATABASE_SSL_CA")?.trim() ||
      process.env.DATABASE_SSL_CA?.trim();

    const isAivenHost = /\.aivencloud\.com/i.test(connectionString);
    const skipTlsVerify =
      !sslCa && (tlsVerifyDisabledExplicit() || isAivenHost);

    const poolConfig: PoolConfig = {};

    if (sslCa) {
      const caPath = path.isAbsolute(sslCa) ? sslCa : path.join(process.cwd(), sslCa);
      poolConfig.connectionString = connectionString;
      poolConfig.ssl = {
        rejectUnauthorized: true,
        ca: fs.readFileSync(caPath, "utf-8"),
      };
    } else if (skipTlsVerify) {
      poolConfig.connectionString = postgresUrlWithoutSslMode(connectionString);
      poolConfig.ssl = { rejectUnauthorized: false };
      if (process.env.NODE_ENV !== "test") {
        console.warn(
          "[PrismaService] Postgres TLS: rejectUnauthorized=false" +
            (isAivenHost ? " (Aiven host detected)" : " (DATABASE_SSL_REJECT_UNAUTHORIZED)") +
            ". Use DATABASE_SSL_CA for full verification when possible.",
        );
      }
    } else {
      poolConfig.connectionString = connectionString;
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
