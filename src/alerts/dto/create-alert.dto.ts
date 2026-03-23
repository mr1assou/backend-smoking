import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAlertDto {
    @IsNotEmpty()
    @IsString()
    type: string; // Ou ton Enum AlertType si tu préfères stricts

    // Optionnel, car c'est soit type soit status venant du mobile
    @IsOptional()
    @IsString()
    status?: string;

    @IsOptional()
    @IsString()
    comment?: string;

    @IsOptional()
    @IsString()
    photo_url?: string;

    @IsOptional()
    @IsString()
    asset_id?: string;

    @IsOptional()
    @IsString()
    location_id?: string;
}
