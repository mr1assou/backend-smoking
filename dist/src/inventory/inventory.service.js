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
var InventoryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let InventoryService = InventoryService_1 = class InventoryService {
    prisma;
    logger = new common_1.Logger(InventoryService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async cleanupStaleSessions() {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const stale = await this.prisma.inventorySession.findMany({
            where: { ended_at: null, started_at: { lt: oneHourAgo } },
            select: { id: true, started_at: true },
        });
        if (stale.length === 0)
            return;
        this.logger.log(`Nettoyage de ${stale.length} session(s) abandonnée(s)`);
        for (const session of stale) {
            await this.prisma.$transaction(async (tx) => {
                await tx.inventoryTag.deleteMany({ where: { session_id: session.id } });
                await tx.assetMovement.deleteMany({
                    where: { session_id: session.id },
                });
                await tx.inventorySession.delete({ where: { id: session.id } });
            });
            this.logger.log(`Session ${session.id.slice(0, 8)} supprimée (démarrée ${session.started_at.toISOString()})`);
        }
    }
    async findActiveSessions(userId) {
        const where = { ended_at: null };
        if (userId)
            where.user_id = userId;
        return this.prisma.inventorySession.findMany({
            where,
            orderBy: { started_at: 'desc' },
            include: {
                user: { select: { id: true, name: true } },
                location: { select: { id: true, name: true, type: true } },
            },
        });
    }
    async createSession(dto, userId) {
        const location = await this.prisma.location.findUnique({
            where: { id: dto.location_id },
        });
        if (!location) {
            throw new common_1.NotFoundException(`Location ${dto.location_id} not found`);
        }
        const expectedAssets = await this.prisma.asset.findMany({
            where: {
                location_id: dto.location_id,
                tag_id: { not: null },
            },
            select: { tag_id: true },
        });
        const session = await this.prisma.inventorySession.create({
            data: {
                user_id: userId,
                location_id: dto.location_id,
                total_expected: expectedAssets.length,
            },
        });
        return {
            sessionId: session.id,
            location: location.name,
            totalExpected: expectedAssets.length,
            expectedEpcs: expectedAssets.map((a) => a.tag_id),
        };
    }
    async submitTags(sessionId, dto, userId) {
        const session = await this.prisma.inventorySession.findUnique({
            where: { id: sessionId },
        });
        if (!session) {
            throw new common_1.NotFoundException(`Session ${sessionId} not found`);
        }
        if (session.ended_at) {
            throw new common_1.ConflictException('Session already closed');
        }
        const incomingEpcs = dto.tags.map((t) => t.epc);
        const existing = await this.prisma.inventoryTag.findMany({
            where: {
                session_id: sessionId,
                epc_code: { in: incomingEpcs },
            },
            select: { epc_code: true },
        });
        const seenSet = new Set(existing.map((e) => e.epc_code));
        const newTags = dto.tags.filter((t) => !seenSet.has(t.epc));
        if (newTags.length === 0) {
            return { processed: 0, results: [] };
        }
        const newEpcs = newTags.map((t) => t.epc);
        const assets = await this.prisma.asset.findMany({
            where: { tag_id: { in: newEpcs } },
            select: { id: true, tag_id: true, name: true, location_id: true },
        });
        const assetMap = new Map(assets.map((a) => [a.tag_id, a]));
        const rssiMap = new Map(newTags.map((t) => [t.epc, t.rssi ?? null]));
        const classified = newEpcs.map((epc) => {
            const asset = assetMap.get(epc);
            if (!asset) {
                return {
                    epc,
                    classification: client_1.TagClassification.UNKNOWN,
                    asset_id: null,
                    asset_name: null,
                    from_location_id: null,
                    rssi: rssiMap.get(epc) ?? null,
                };
            }
            return {
                epc,
                classification: client_1.TagClassification.EXPECTED,
                asset_id: asset.id,
                asset_name: asset.name,
                from_location_id: asset.location_id,
                rssi: rssiMap.get(epc) ?? null,
            };
        });
        const movements = classified.filter((t) => t.asset_id && t.from_location_id !== session.location_id);
        const knownAssetIds = classified
            .filter((t) => t.asset_id)
            .map((t) => t.asset_id);
        await this.prisma.$transaction(async (tx) => {
            await tx.inventoryTag.createMany({
                data: classified.map((t) => ({
                    session_id: sessionId,
                    epc_code: t.epc,
                    asset_id: t.asset_id,
                    classification: t.classification,
                    rssi: t.rssi,
                })),
                skipDuplicates: true,
            });
            await tx.inventorySession.update({
                where: { id: sessionId },
                data: { last_scan_at: new Date() },
            });
            if (movements.length > 0) {
                await tx.assetMovement.createMany({
                    data: movements.map((m) => ({
                        asset_id: m.asset_id,
                        from_location_id: m.from_location_id,
                        to_location_id: session.location_id,
                        user_id: userId,
                        session_id: sessionId,
                    })),
                });
                const movedAssetIds = movements.map((m) => m.asset_id);
                await tx.asset.updateMany({
                    where: { id: { in: movedAssetIds } },
                    data: { location_id: session.location_id },
                });
            }
        });
        return {
            processed: classified.length,
            results: classified.map((t) => ({
                epc: t.epc,
                classification: t.classification,
                asset_name: t.asset_name,
            })),
        };
    }
    async closeSession(sessionId) {
        const session = await this.prisma.inventorySession.findUnique({
            where: { id: sessionId },
        });
        if (!session) {
            throw new common_1.NotFoundException(`Session ${sessionId} not found`);
        }
        if (session.ended_at) {
            throw new common_1.ConflictException('Session already closed');
        }
        const counts = await this.prisma.inventoryTag.groupBy({
            by: ['classification'],
            where: { session_id: sessionId },
            _count: true,
        });
        const countMap = new Map(counts.map((c) => [c.classification, c._count]));
        const foundCount = (countMap.get(client_1.TagClassification.EXPECTED) ?? 0) +
            (countMap.get(client_1.TagClassification.UNEXPECTED) ?? 0);
        const unknownCount = countMap.get(client_1.TagClassification.UNKNOWN) ?? 0;
        const totalScanned = foundCount + unknownCount;
        const missingCount = session.total_expected - foundCount;
        const movementCount = await this.prisma.assetMovement.count({
            where: { session_id: sessionId },
        });
        const scannedAssets = await this.prisma.inventoryTag.findMany({
            where: { session_id: sessionId, asset_id: { not: null } },
            select: { asset_id: true },
            distinct: ['asset_id'],
        });
        if (scannedAssets.length > 0) {
            await this.prisma.assetHistory.createMany({
                data: scannedAssets.map((t) => ({
                    asset_id: t.asset_id,
                    user_id: session.user_id,
                    action: `Inventaire session ${sessionId.slice(0, 8)}`,
                })),
            });
        }
        const updated = await this.prisma.inventorySession.update({
            where: { id: sessionId },
            data: {
                ended_at: new Date(),
                total_scanned: totalScanned,
                found_count: foundCount,
                missing_count: Math.max(0, missingCount),
                unexpected_count: 0,
                unknown_count: unknownCount,
                movement_count: movementCount,
            },
            include: {
                user: { select: { id: true, name: true } },
                location: { select: { id: true, name: true } },
            },
        });
        return {
            session: updated,
            summary: {
                total_scanned: totalScanned,
                total_expected: session.total_expected,
                found: foundCount,
                missing: Math.max(0, missingCount),
                unexpected: 0,
                unknown: unknownCount,
                movements: movementCount,
                duration_seconds: Math.round((updated.ended_at.getTime() - updated.started_at.getTime()) / 1000),
            },
        };
    }
    async findAll() {
        return this.prisma.inventorySession.findMany({
            orderBy: { started_at: 'desc' },
            include: {
                user: { select: { id: true, name: true } },
                location: { select: { id: true, name: true, type: true } },
            },
        });
    }
    async findOne(sessionId) {
        const session = await this.prisma.inventorySession.findUnique({
            where: { id: sessionId },
            include: {
                user: { select: { id: true, name: true, email: true } },
                location: { select: { id: true, name: true, type: true } },
                tags: {
                    orderBy: { scanned_at: 'asc' },
                    include: {
                        asset: {
                            select: {
                                id: true,
                                name: true,
                                brand: true,
                                status: true,
                                category: { select: { name: true } },
                            },
                        },
                    },
                },
            },
        });
        if (!session) {
            throw new common_1.NotFoundException(`Session ${sessionId} not found`);
        }
        return session;
    }
};
exports.InventoryService = InventoryService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_10_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], InventoryService.prototype, "cleanupStaleSessions", null);
exports.InventoryService = InventoryService = InventoryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map