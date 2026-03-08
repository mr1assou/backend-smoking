import { AssetStatus } from '@prisma/client';
export declare class CreateMassScanDto {
    tag_ids: string[];
    status: AssetStatus;
    location_id: string;
}
