import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { AssetStatus } from '@prisma/client';

export class CreateAssetDto {
    @IsString()
    @IsNotEmpty()
    tag_id: string;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsUUID()
    category_id: string;

    @IsString()
    @IsNotEmpty()
    brand: string;

    @IsString()
    @IsNotEmpty()
    model: string;

    @IsUUID()
    supplier_id: string;

    @IsDateString()
    purchase_date: string;

    @IsNumber()
    price: number;

    @IsDateString()
    @IsOptional()
    warranty_end?: string;

    @IsUUID()
    location_id: string;

    @IsEnum(AssetStatus)
    @IsOptional()
    status?: AssetStatus;
}
