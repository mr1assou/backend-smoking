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
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let AnalyticsService = class AnalyticsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getFinancial() {
        const totals = await this.prisma.asset.aggregate({
            _sum: { price: true },
            _count: true,
        });
        const totalAcquisition = Number(totals._sum.price ?? 0);
        const totalAssets = totals._count;
        const byCategory = await this.prisma.asset.groupBy({
            by: ['category_id'],
            _sum: { price: true },
            _count: true,
        });
        const categoryIds = byCategory.map(r => r.category_id);
        const categories = await this.prisma.category.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true, name: true },
        });
        const catMap = new Map(categories.map(c => [c.id, c.name]));
        const categorySummary = byCategory
            .map(r => ({
            category: catMap.get(r.category_id) ?? 'Inconnu',
            count: r._count,
            acquisition: Number(r._sum.price ?? 0),
        }))
            .sort((a, b) => b.acquisition - a.acquisition);
        const byStatus = await this.prisma.asset.groupBy({
            by: ['status'],
            _sum: { price: true },
            _count: true,
        });
        const statusSummary = byStatus.map(r => ({
            status: r.status,
            count: r._count,
            value: Number(r._sum.price ?? 0),
        }));
        const byLocation = await this.prisma.asset.groupBy({
            by: ['location_id'],
            _sum: { price: true },
            _count: true,
        });
        const locationIds = byLocation.map(r => r.location_id);
        const locations = await this.prisma.location.findMany({
            where: { id: { in: locationIds } },
            select: { id: true, name: true },
        });
        const locMap = new Map(locations.map(l => [l.id, l.name]));
        const locationSummary = byLocation
            .map(r => ({
            location: locMap.get(r.location_id) ?? 'Inconnu',
            count: r._count,
            value: Number(r._sum.price ?? 0),
        }))
            .sort((a, b) => b.value - a.value);
        const replaceValue = statusSummary
            .filter(s => s.status === 'TO_REPLACE')
            .reduce((sum, s) => sum + s.value, 0);
        return {
            totalAssets,
            totalAcquisition,
            replacementBudget: Math.round(replaceValue * 0.1),
            categorySummary,
            statusSummary,
            locationSummary,
        };
    }
    async getScans() {
        const now = new Date();
        const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        const scansPerDay = await this.prisma.$queryRaw `
      SELECT date_trunc('day', scanned_at)::date AS day,
             COUNT(*)::int                        AS count
      FROM   scans
      WHERE  scanned_at >= ${fourteenDaysAgo}
      GROUP  BY 1
      ORDER  BY 1
    `;
        const byLocation = await this.prisma.scan.groupBy({
            by: ['location_id'],
            _count: true,
            orderBy: { _count: { location_id: 'desc' } },
            take: 10,
        });
        const locIds = byLocation.map(r => r.location_id);
        const locs = await this.prisma.location.findMany({
            where: { id: { in: locIds } },
            select: { id: true, name: true },
        });
        const lMap = new Map(locs.map(l => [l.id, l.name]));
        const scansByLocation = byLocation.map(r => ({
            location: lMap.get(r.location_id) ?? 'Inconnu',
            count: r._count,
        }));
        const totalAssets = await this.prisma.asset.count();
        const scannedAssets = await this.prisma.scan.findMany({
            select: { asset_id: true },
            distinct: ['asset_id'],
        });
        const coverageRate = totalAssets > 0
            ? Math.round((scannedAssets.length / totalAssets) * 100)
            : 0;
        const recentMovements = await this.prisma.assetMovement.findMany({
            orderBy: { moved_at: 'desc' },
            take: 20,
            include: {
                asset: { select: { name: true } },
                from_location: { select: { name: true } },
                to_location: { select: { name: true } },
                user: { select: { name: true } },
            },
        });
        const movements = recentMovements.map(m => ({
            asset: m.asset.name,
            from: m.from_location?.name ?? 'Entrepôt',
            to: m.to_location.name,
            user: m.user.name,
            date: m.moved_at,
        }));
        const flowRaw = await this.prisma.$queryRaw `
      SELECT COALESCE(fl.name, 'Entrepôt') AS from_name,
             tl.name                        AS to_name,
             COUNT(*)::int                  AS count
      FROM   asset_movements am
      JOIN   locations tl ON tl.id = am.to_location_id
      LEFT JOIN locations fl ON fl.id = am.from_location_id
      GROUP  BY 1, 2
      ORDER  BY count DESC
      LIMIT  10
    `;
        return {
            totalScans: scansPerDay.reduce((s, d) => s + d.count, 0),
            coverageRate,
            scannedAssets: scannedAssets.length,
            totalAssets,
            scansPerDay,
            scansByLocation,
            movements,
            flows: flowRaw.map(f => ({
                from: f.from_name,
                to: f.to_name,
                count: f.count,
            })),
        };
    }
    async getPerformance() {
        const byStatus = await this.prisma.asset.groupBy({
            by: ['status'],
            _count: true,
        });
        const totalAssets = byStatus.reduce((s, r) => s + r._count, 0);
        const goodCount = byStatus.find(r => r.status === 'GOOD')?._count ?? 0;
        const healthRate = totalAssets > 0 ? Math.round((goodCount / totalAssets) * 100) : 0;
        const anomalyByZone = await this.prisma.$queryRaw `
        SELECT l.name                                      AS location,
               COUNT(*)::int                               AS total,
               COUNT(*) FILTER (WHERE a.status != 'GOOD')::int AS anomalies,
               CASE WHEN COUNT(*) > 0
                    THEN ROUND(COUNT(*) FILTER (WHERE a.status != 'GOOD')::numeric / COUNT(*) * 100)::int
                    ELSE 0
               END                                         AS rate
        FROM   assets a
        JOIN   locations l ON l.id = a.location_id
        GROUP  BY l.name
        HAVING COUNT(*) FILTER (WHERE a.status != 'GOOD') > 0
        ORDER  BY rate DESC
        LIMIT  10
      `;
        const sessions = await this.prisma.inventorySession.aggregate({
            _count: true,
            _sum: {
                total_scanned: true,
                total_expected: true,
                found_count: true,
                missing_count: true,
                unexpected_count: true,
            },
            _avg: {
                total_scanned: true,
                found_count: true,
            },
        });
        const totalExpected = sessions._sum.total_expected ?? 0;
        const totalFound = sessions._sum.found_count ?? 0;
        const foundRate = totalExpected > 0 ? Math.round((totalFound / totalExpected) * 100) : 0;
        const sessionsByLoc = await this.prisma.inventorySession.groupBy({
            by: ['location_id'],
            _count: true,
            _avg: { total_scanned: true, found_count: true },
            orderBy: { _count: { location_id: 'desc' } },
            take: 8,
        });
        const sessLocIds = sessionsByLoc.map(r => r.location_id);
        const sessLocs = await this.prisma.location.findMany({
            where: { id: { in: sessLocIds } },
            select: { id: true, name: true },
        });
        const slMap = new Map(sessLocs.map(l => [l.id, l.name]));
        const sessionSummary = sessionsByLoc.map(r => ({
            location: slMap.get(r.location_id) ?? 'Inconnu',
            sessions: r._count,
            avgScanned: Math.round(r._avg.total_scanned ?? 0),
            avgFound: Math.round(r._avg.found_count ?? 0),
        }));
        const scannedDistinct = await this.prisma.scan.findMany({
            select: { asset_id: true },
            distinct: ['asset_id'],
        });
        const validatedCount = await this.prisma.asset.count({
            where: { status: 'GOOD', scans: { some: {} } },
        });
        const reportedCount = await this.prisma.alert.count();
        return {
            totalAssets,
            healthRate,
            statusBreakdown: byStatus.map(r => ({ status: r.status, count: r._count })),
            anomalyByZone,
            inventory: {
                totalSessions: sessions._count,
                totalScanned: sessions._sum.total_scanned ?? 0,
                totalExpected,
                foundRate,
                avgScannedPerSession: Math.round(sessions._avg.total_scanned ?? 0),
                totalMissing: sessions._sum.missing_count ?? 0,
                totalUnexpected: sessions._sum.unexpected_count ?? 0,
            },
            sessionSummary,
            funnel: {
                total: totalAssets,
                scanned: scannedDistinct.length,
                validated: validatedCount,
                reported: reportedCount,
            },
        };
    }
    async getCompliance() {
        const totalAssets = await this.prisma.asset.count();
        const tagged = await this.prisma.asset.count({ where: { tag_id: { not: null } } });
        const untagged = totalAssets - tagged;
        const tagRate = totalAssets > 0 ? Math.round((tagged / totalAssets) * 100) : 0;
        const scannedDistinct = await this.prisma.scan.findMany({
            select: { asset_id: true },
            distinct: ['asset_id'],
        });
        const scanRate = totalAssets > 0
            ? Math.round((scannedDistinct.length / totalAssets) * 100)
            : 0;
        const alertsByStatus = await this.prisma.alert.groupBy({
            by: ['status'],
            _count: true,
        });
        const openAlerts = alertsByStatus.find(r => r.status === 'OPEN')?._count ?? 0;
        const resolvedAlerts = alertsByStatus.find(r => r.status === 'RESOLVED')?._count ?? 0;
        const resolveRate = (openAlerts + resolvedAlerts) > 0
            ? Math.round((resolvedAlerts / (openAlerts + resolvedAlerts)) * 100)
            : 100;
        const alertsByType = await this.prisma.alert.groupBy({
            by: ['type'],
            _count: true,
            orderBy: { _count: { type: 'desc' } },
        });
        const complianceScore = Math.round(tagRate * 0.4 + scanRate * 0.35 + resolveRate * 0.25);
        const ncByLocation = await this.prisma.$queryRaw `
        SELECT l.name AS location,
               COUNT(*) FILTER (WHERE a.tag_id IS NULL)::int                        AS untagged,
               COUNT(*) FILTER (WHERE NOT EXISTS (
                 SELECT 1 FROM scans s WHERE s.asset_id = a.id
               ))::int                                                              AS not_scanned,
               COUNT(*) FILTER (WHERE a.status IN ('DAMAGED', 'TO_REPLACE'))::int    AS damaged
        FROM   assets a
        JOIN   locations l ON l.id = a.location_id
        GROUP  BY l.name
        HAVING COUNT(*) FILTER (WHERE a.tag_id IS NULL) > 0
            OR COUNT(*) FILTER (WHERE NOT EXISTS (
                 SELECT 1 FROM scans s WHERE s.asset_id = a.id
               )) > 0
            OR COUNT(*) FILTER (WHERE a.status IN ('DAMAGED', 'TO_REPLACE')) > 0
        ORDER  BY (COUNT(*) FILTER (WHERE a.tag_id IS NULL)
                 + COUNT(*) FILTER (WHERE a.status IN ('DAMAGED', 'TO_REPLACE'))) DESC
        LIMIT  10
      `;
        const auditLog = await this.prisma.alert.findMany({
            orderBy: { created_at: 'desc' },
            take: 20,
            include: {
                asset: { select: { name: true } },
                location: { select: { name: true } },
            },
        });
        const log = auditLog.map(a => ({
            id: a.id,
            date: a.created_at,
            type: a.type,
            status: a.status,
            asset: a.asset?.name ?? '—',
            location: a.location?.name ?? '—',
            comment: a.comment,
        }));
        const compliant = await this.prisma.asset.count({
            where: {
                tag_id: { not: null },
                status: 'GOOD',
                scans: { some: {} },
            },
        });
        return {
            totalAssets,
            complianceScore,
            tagged,
            untagged,
            tagRate,
            scanRate,
            scannedAssets: scannedDistinct.length,
            openAlerts,
            resolvedAlerts,
            resolveRate,
            compliant,
            nonCompliant: totalAssets - compliant,
            alertsByType: alertsByType.map(r => ({ type: r.type, count: r._count })),
            ncByLocation,
            auditLog: log,
        };
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map