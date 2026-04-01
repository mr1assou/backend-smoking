import { AssetStatus } from '@prisma/client';

export class AssetOutputDto {
  id: string;
  tag_id: string;
  name: string;
  category: string;
  location: string;
  status: string; // Texte lisible (ex: BON ÉTAT)
  brand: string;
  purchase_price: number;
  net_value: string;
  purchase_year: number;
  last_scan: Date | null;
}
