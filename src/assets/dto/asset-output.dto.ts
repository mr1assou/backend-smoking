import { AssetStatus } from '@prisma/client';

export class AssetOutputDto {
    id: string;
    nom: string;
    categorie: string;
    etat: AssetStatus;
    prix_achat: number;
    annee_achat: number;
    localisation: string;
    valeur_net: string;
    dernier_scan: Date | null;
    marque: string;
}
