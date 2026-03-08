import { AssetStatus } from '@prisma/client';
export declare class CreateAssetDto {
    tag_id: string;
    name: string;
    category_id: string;
    brand: string;
    model: string;
    supplier_id: string;
    purchase_date: string;
    price: number;
    warranty_end?: string;
    location_id: string;
    status?: AssetStatus;
}
