"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PrismaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const fs_1 = require("fs");
const path_1 = require("path");
const pg_1 = require("pg");
function connectionStringWithoutSslParams(raw) {
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
    const tzFlag = '-c TimeZone=UTC';
    const options = url.searchParams.get('options');
    if (!options?.includes('TimeZone=')) {
        url.searchParams.set('options', options ? `${options} ${tzFlag}` : tzFlag);
    }
    return url.toString();
}
function isTransientPgError(error) {
    if (!(error instanceof Error))
        return false;
    const message = error.message.toLowerCase();
    return (message.includes('connection terminated') ||
        message.includes('econnreset') ||
        message.includes('etimedout') ||
        message.includes('connection closed') ||
        message.includes('server closed the connection'));
}
function createPgPool(config) {
    const rawUrl = config.get('DATABASE_URL');
    if (!rawUrl) {
        throw new Error('DATABASE_URL is not set');
    }
    const caPath = config.get('DATABASE_CA_PATH') ??
        (0, path_1.join)(process.cwd(), 'certs', 'ca.pem');
    const poolConfig = {
        connectionString: connectionStringWithoutSslParams(rawUrl),
        ssl: {
            ca: (0, fs_1.readFileSync)(caPath, 'utf8'),
            rejectUnauthorized: true,
        },
        max: 20,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 30_000,
        maxLifetimeSeconds: 300,
        keepAlive: true,
        keepAliveInitialDelayMillis: 10_000,
    };
    const pool = new pg_1.Pool(poolConfig);
    const logger = new common_1.Logger('PgPool');
    pool.on('error', (error) => {
        logger.error('Idle PostgreSQL client error — connection removed from pool', error);
    });
    return pool;
}
let PrismaService = PrismaService_1 = class PrismaService extends client_1.PrismaClient {
    pool;
    logger = new common_1.Logger(PrismaService_1.name);
    constructor(config) {
        const pool = createPgPool(config);
        const adapter = new adapter_pg_1.PrismaPg(pool);
        const logger = new common_1.Logger(PrismaService_1.name);
        super({ adapter });
        const extended = this.$extends({
            name: 'pg-connection-retry',
            query: {
                $allModels: {
                    async $allOperations({ args, query }) {
                        try {
                            return await query(args);
                        }
                        catch (error) {
                            if (!isTransientPgError(error)) {
                                throw error;
                            }
                            logger.warn('PostgreSQL connection dropped — retrying query once');
                            await new Promise((resolve) => setTimeout(resolve, 150));
                            return query(args);
                        }
                    },
                },
            },
        });
        const service = extended;
        Object.defineProperty(service, 'pool', { value: pool });
        service.onModuleInit = async () => {
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    await service.$connect();
                    break;
                }
                catch (error) {
                    if (attempt === 3)
                        throw error;
                    logger.warn(`PostgreSQL connect failed — retry ${attempt}/2`);
                    await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
                }
            }
            await service.$queryRaw `SELECT 1`;
            logger.log('PostgreSQL connection verified');
        };
        service.onModuleDestroy = async () => {
            await service.$disconnect();
            await pool.end();
        };
        return service;
    }
    async onModuleInit() {
    }
    async onModuleDestroy() {
    }
};
exports.PrismaService = PrismaService;
exports.PrismaService = PrismaService = PrismaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], PrismaService);
//# sourceMappingURL=prisma.service.js.map