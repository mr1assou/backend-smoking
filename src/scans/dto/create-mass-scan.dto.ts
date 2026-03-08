import { IsArray, IsString, IsEnum, IsUUID } from 'class-validator';
import { AssetStatus } from '@prisma/client';

export class CreateMassScanDto {
    @IsArray()
    @IsString({ each: true })
    tag_ids: string[]; // Liste des tags RFID détectés

    @IsEnum(AssetStatus)
    status: AssetStatus;

    @IsUUID()
    location_id: string; // La pièce où se fait l'inventaire
}