import { AlertsService } from './alerts.service';
export declare class AlertsController {
    private readonly alertsService;
    constructor(alertsService: AlertsService);
    findAll(): Promise<({
        asset: {
            category: {
                id: string;
                name: string;
            };
            location: {
                id: string;
                name: string;
                parent_id: string | null;
                type: import(".prisma/client").$Enums.LocationType;
            };
        } & {
            id: string;
            name: string;
            created_at: Date;
            tag_id: string;
            category_id: string;
            brand: string;
            model: string;
            supplier_id: string;
            purchase_date: Date;
            price: import("@prisma/client/runtime/library").Decimal;
            warranty_end: Date | null;
            location_id: string;
            status: import(".prisma/client").$Enums.AssetStatus;
        };
    } & {
        id: string;
        created_at: Date;
        type: import(".prisma/client").$Enums.AlertType;
        status: import(".prisma/client").$Enums.AlertStatus;
        asset_id: string;
        comment: string | null;
        image_url: string | null;
    })[]>;
    update(id: string, status: string): Promise<{
        id: string;
        created_at: Date;
        type: import(".prisma/client").$Enums.AlertType;
        status: import(".prisma/client").$Enums.AlertStatus;
        asset_id: string;
        comment: string | null;
        image_url: string | null;
    }>;
}
