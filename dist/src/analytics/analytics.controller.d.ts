import { AnalyticsService } from './analytics.service';
export declare class AnalyticsController {
    private readonly analytics;
    constructor(analytics: AnalyticsService);
    getFinancial(): Promise<{
        totalAssets: number;
        totalAcquisition: number;
        replacementBudget: number;
        categorySummary: {
            category: string;
            count: number;
            acquisition: number;
        }[];
        statusSummary: {
            status: import(".prisma/client").$Enums.AssetStatus;
            count: number;
            value: number;
        }[];
        locationSummary: {
            location: string;
            count: number;
            value: number;
        }[];
    }>;
    getScans(): Promise<{
        totalScans: number;
        coverageRate: number;
        scannedAssets: number;
        totalAssets: number;
        scansPerDay: {
            day: string;
            count: number;
        }[];
        scansByLocation: {
            location: string;
            count: number;
        }[];
        movements: {
            asset: string;
            from: string;
            to: string;
            user: string;
            date: Date;
        }[];
        flows: {
            from: string;
            to: string;
            count: number;
        }[];
    }>;
    getPerformance(): Promise<{
        totalAssets: number;
        healthRate: number;
        statusBreakdown: {
            status: import(".prisma/client").$Enums.AssetStatus;
            count: number;
        }[];
        anomalyByZone: {
            location: string;
            total: number;
            anomalies: number;
            rate: number;
        }[];
        inventory: {
            totalSessions: number;
            totalScanned: number;
            totalExpected: number;
            foundRate: number;
            avgScannedPerSession: number;
            totalMissing: number;
            totalUnexpected: number;
        };
        sessionSummary: {
            location: string;
            sessions: number;
            avgScanned: number;
            avgFound: number;
        }[];
        funnel: {
            total: number;
            scanned: number;
            validated: number;
            reported: number;
        };
    }>;
    getCompliance(): Promise<{
        totalAssets: number;
        complianceScore: number;
        tagged: number;
        untagged: number;
        tagRate: number;
        scanRate: number;
        scannedAssets: number;
        openAlerts: number;
        resolvedAlerts: number;
        resolveRate: number;
        compliant: number;
        nonCompliant: number;
        alertsByType: {
            type: import(".prisma/client").$Enums.AlertType;
            count: number;
        }[];
        ncByLocation: {
            location: string;
            untagged: number;
            not_scanned: number;
            damaged: number;
        }[];
        auditLog: {
            id: string;
            date: Date;
            type: import(".prisma/client").$Enums.AlertType;
            status: import(".prisma/client").$Enums.AlertStatus;
            asset: string;
            location: string;
            comment: string | null;
        }[];
    }>;
}
