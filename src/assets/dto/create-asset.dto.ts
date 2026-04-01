import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateAssetDto {
  @IsString()
  @IsNotEmpty()
  tag_id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  // Catégorie : UUID direct OU nom texte libre (findOrCreate)
  @IsUUID()
  @IsOptional()
  category_id?: string;

  @IsString()
  @IsOptional()
  category?: string;

  // Localisation : UUID direct OU nom texte libre
  @IsUUID()
  @IsOptional()
  location_id?: string;

  @IsString()
  @IsOptional()
  location?: string;

  // Fournisseur : UUID direct OU nom texte libre
  @IsUUID()
  @IsOptional()
  supplier_id?: string;

  @IsString()
  @IsOptional()
  supplier?: string;

  // Statut : string libre — le service mappe vers AssetStatus
  @IsString()
  @IsOptional()
  status?: string;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  brand?: string;

  @IsString()
  @IsOptional()
  model?: string;

  // Dates en string libre — new Date() gère tous les formats ISO
  @IsString()
  @IsOptional()
  purchase_date?: string;

  @IsString()
  @IsOptional()
  warranty_end?: string;

  // Image : base64 ou URL
  @IsString()
  @IsOptional()
  image_url?: string;
}
