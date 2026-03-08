import { AssetStatus } from '@prisma/client';
export declare class CreateScanDto {
    tag_id: string;
    asset_id: string;
    location_id: string;
    status: AssetStatus;
    user_id?: string;
    comment?: string;
    image_data?: string;
}
