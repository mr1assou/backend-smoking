"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const config_1 = require("@nestjs/config");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function postgresUrlWithoutSslMode(connectionString) {
    try {
        const u = new URL(connectionString.replace(/^postgresql:/i, "https:"));
        u.searchParams.delete("sslmode");
        u.searchParams.delete("uselibpqcompat");
        let out = u.toString().replace(/^https:/i, "postgresql:");
        out = out.replace(/\?$/, "");
        return out;
    }
    catch {
        return connectionString;
    }
}
function tlsVerifyDisabledExplicit() {
    const raw = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED?.trim().toLowerCase() ??
        "";
    return raw === "false" || raw === "0" || raw === "no";
}
function findPackageRoot(startDir) {
    let dir = startDir;
    for (let i = 0; i < 8; i++) {
        if (fs.existsSync(path.join(dir, "package.json"))) {
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
function loadCaPem(sslCaConfig) {
    const trimmed = sslCaConfig.trim();
    if (trimmed.includes("-----BEGIN")) {
        return { pem: trimmed.replace(/\\n/g, "\n"), source: "DATABASE_SSL_CA (inline PEM)" };
    }
    const root = findPackageRoot(__dirname);
    const candidates = [
        path.isAbsolute(trimmed) ? trimmed : path.join(process.cwd(), trimmed),
        path.join(root, trimmed),
    ];
    for (const caPath of candidates) {
        if (fs.existsSync(caPath)) {
            return { pem: fs.readFileSync(caPath, "utf-8"), source: caPath };
        }
    }
    throw new Error(`DATABASE_SSL_CA file not found. Tried: ${candidates.join(", ")} (cwd=${process.cwd()})`);
}
let PrismaService = class PrismaService extends client_1.PrismaClient {
    config;
    driverPool;
    constructor(config) {
        const connectionString = config.get("DATABASE_URL")?.trim() || process.env.DATABASE_URL?.trim();
        if (!connectionString) {
            throw new Error("DATABASE_URL is not set");
        }
        const sslCa = config.get("DATABASE_SSL_CA")?.trim() ||
            process.env.DATABASE_SSL_CA?.trim();
        const isAivenHost = /\.aivencloud\.com/i.test(connectionString);
        const skipTlsVerify = !sslCa && (tlsVerifyDisabledExplicit() || isAivenHost);
        const poolConfig = {};
        if (sslCa) {
            const { pem, source } = loadCaPem(sslCa);
            poolConfig.connectionString = postgresUrlWithoutSslMode(connectionString);
            poolConfig.ssl = {
                rejectUnauthorized: true,
                ca: pem,
            };
            if (process.env.NODE_ENV !== "test") {
                console.warn(`[PrismaService] Postgres TLS: CA from ${source} (${pem.length} chars)`);
            }
        }
        else if (skipTlsVerify) {
            poolConfig.connectionString = postgresUrlWithoutSslMode(connectionString);
            poolConfig.ssl = { rejectUnauthorized: false };
            if (process.env.NODE_ENV !== "test") {
                console.warn("[PrismaService] Postgres TLS: rejectUnauthorized=false" +
                    (isAivenHost ? " (Aiven host detected)" : " (DATABASE_SSL_REJECT_UNAUTHORIZED)") +
                    ". Use DATABASE_SSL_CA for full verification when possible.");
            }
        }
        else {
            poolConfig.connectionString = connectionString;
        }
        const pool = new pg_1.Pool(poolConfig);
        super({ adapter: new adapter_pg_1.PrismaPg(pool) });
        this.config = config;
        this.driverPool = pool;
    }
    async queryReadOnlySql(sql) {
        const res = await this.driverPool.query(sql);
        return res.rows;
    }
    async onModuleInit() {
        await this.$connect();
    }
    async onModuleDestroy() {
        await this.$disconnect();
    }
};
exports.PrismaService = PrismaService;
exports.PrismaService = PrismaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], PrismaService);
//# sourceMappingURL=prisma.service.js.map