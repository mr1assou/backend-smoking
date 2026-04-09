import { IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateAssetDto {
  @IsString()
  @IsOptional()
  tag_id?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsUUID()
  @IsOptional()
  category_id?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsUUID()
  @IsOptional()
  location_id?: string;

  @IsString()
  @IsOptional()
  location?: string;

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

  @IsString()
  @IsOptional()
  purchase_date?: string;

  @IsString()
  @IsOptional()
  warranty_end?: string;

  @IsString()
  @IsOptional()
  image_url?: string;
}
