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
    for (const key of ['sslmode', 'sslrootcert', 'sslcert', 'sslkey', 'uselibpqcompat']) {
        url.searchParams.delete(key);
    }
    const tzFlag = '-c TimeZone=UTC';
    const options = url.searchParams.get('options');
    if (!options?.includes('TimeZone=')) {
        url.searchParams.set('options', options ? `${options} ${tzFlag}` : tzFlag);
    }
    return url.toString();
}
let PrismaService = class PrismaService extends client_1.PrismaClient {
    config;
    constructor(config) {
        const rawUrl = config.get('DATABASE_URL');
        if (!rawUrl) {
            throw new Error('DATABASE_URL is not set');
        }
        const caPath = config.get('DATABASE_CA_PATH') ??
            (0, path_1.join)(process.cwd(), 'certs', 'ca.pem');
        const pool = new pg_1.Pool({
            connectionString: connectionStringWithoutSslParams(rawUrl),
            ssl: {
                ca: (0, fs_1.readFileSync)(caPath, 'utf8'),
                rejectUnauthorized: true,
            },
        });
        const adapter = new adapter_pg_1.PrismaPg(pool);
        super({ adapter });
        this.config = config;
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