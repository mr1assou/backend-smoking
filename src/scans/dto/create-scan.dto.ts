import { IsNotEmpty, IsString, IsUUID, IsEnum, IsOptional } from 'class-validator';
import { AssetStatus } from '@prisma/client';

export class CreateScanDto {
    @IsNotEmpty()
    @IsString()
    tag_id: string;

    @IsNotEmpty()
    @IsUUID()
    asset_id: string;

    @IsNotEmpty()
    @IsUUID()
    location_id: string;

    @IsNotEmpty()
    @IsEnum(AssetStatus)
    status: AssetStatus;

    @IsOptional()
    @IsUUID()
    user_id?: string;
}
