import { LocationsService } from './locations.service';
export declare class LocationsController {
    private readonly locationsService;
    constructor(locationsService: LocationsService);
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
    create(dto: any): Promise<{
        message: string;
    }>;
    update(id: string, dto: any): Promise<{
        message: string;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
