import { PrismaService } from '../prisma/prisma.service';
export declare class LocationsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<({
        children: {
            id: string;
            name: string;
            parent_id: string | null;
            type: import(".prisma/client").$Enums.LocationType;
        }[];
    } & {
        id: string;
        name: string;
        parent_id: string | null;
        type: import(".prisma/client").$Enums.LocationType;
    })[]>;
    findOne(id: string): Promise<({
        parent: {
            id: string;
            name: string;
            parent_id: string | null;
            type: import(".prisma/client").$Enums.LocationType;
        } | null;
        children: {
            id: string;
            name: string;
            parent_id: string | null;
            type: import(".prisma/client").$Enums.LocationType;
        }[];
    } & {
        id: string;
        name: string;
        parent_id: string | null;
        type: import(".prisma/client").$Enums.LocationType;
    }) | null>;
}
