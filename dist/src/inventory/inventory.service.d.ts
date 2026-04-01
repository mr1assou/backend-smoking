import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SubmitTagsDto } from './dto/submit-tags.dto';
export declare class InventoryService {
    private prisma;
    constructor(prisma: PrismaService);
    createSession(dto: CreateSessionDto, userId: string): Promise<{
        sessionId: string;
        location: string;
        totalExpected: number;
        expectedEpcs: (string | null)[];
    }>;
    submitTags(sessionId: string, dto: SubmitTagsDto, userId: string): Promise<{
        processed: number;
        results: {
            epc: string;
            classification: import(".prisma/client").$Enums.TagClassification;
            asset_name: string | null;
        }[];
    }>;
    closeSession(sessionId: string): Promise<{
        session: {
            user: {
                id: string;
                name: string;
            };
            location: {
                id: string;
                name: string;
            };
        } & {
            id: string;
            location_id: string;
            user_id: string;
            started_at: Date;
            ended_at: Date | null;
            last_scan_at: Date | null;
            total_scanned: number;
            total_expected: number;
            found_count: number;
            missing_count: number;
            unexpected_count: number;
            unknown_count: number;
            movement_count: number;
        };
        summary: {
            total_scanned: number;
            total_expected: number;
            found: number;
            missing: number;
            unexpected: number;
            unknown: number;
            movements: number;
            duration_seconds: number;
        };
    }>;
    findAll(): Promise<({
        user: {
            id: string;
            name: string;
        };
        location: {
            id: string;
            name: string;
            type: import(".prisma/client").$Enums.LocationType;
        };
    } & {
        id: string;
        location_id: string;
        user_id: string;
        started_at: Date;
        ended_at: Date | null;
        last_scan_at: Date | null;
        total_scanned: number;
        total_expected: number;
        found_count: number;
        missing_count: number;
        unexpected_count: number;
        unknown_count: number;
        movement_count: number;
    })[]>;
    findOne(sessionId: string): Promise<{
        user: {
            id: string;
            email: string;
            name: string;
        };
        location: {
            id: string;
            name: string;
            type: import(".prisma/client").$Enums.LocationType;
        };
        tags: ({
            asset: {
                id: string;
                name: string;
                category: {
                    name: string;
                };
                brand: string;
                status: import(".prisma/client").$Enums.AssetStatus;
            } | null;
        } & {
            id: string;
            scanned_at: Date;
            asset_id: string | null;
            session_id: string;
            rssi: number | null;
            epc_code: string;
            classification: import(".prisma/client").$Enums.TagClassification;
        })[];
    } & {
        id: string;
        location_id: string;
        user_id: string;
        started_at: Date;
        ended_at: Date | null;
        last_scan_at: Date | null;
        total_scanned: number;
        total_expected: number;
        found_count: number;
        missing_count: number;
        unexpected_count: number;
        unknown_count: number;
        movement_count: number;
    }>;
}
