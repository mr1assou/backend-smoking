import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AiService {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor(
        private prisma: PrismaService,
        private config: ConfigService,
    ) {
        const apiKey = this.config.get<string>('GEMINI_API_KEY');
        if (!apiKey || apiKey === "INSERT_YOUR_GEMINI_API_KEY_HERE") {
            // Handle missing API key gracefully during dev
            console.warn('GEMINI_API_KEY is not configured. AI suggestions will fail.');
            this.genAI = new GoogleGenerativeAI('placeholder');
        } else {
            this.genAI = new GoogleGenerativeAI(apiKey);
        }
        this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    }

    async getReplacementSuggestions(assetId: string) {
        const asset = await this.prisma.asset.findUnique({
            where: { id: assetId },
            include: { category: true, supplier: true },
        });

        if (!asset) throw new NotFoundException('Asset not found');

        const suppliers = await this.prisma.supplier.findMany();
        const suppliersList = suppliers.map(s => s.name).join(', ');

        const prompt = `
        En tant qu'expert en gestion d'actifs hôteliers pour le Royal Mansour, analyse cet actif en fin de vie :
        - Nom : ${asset.name}
        - Catégorie : ${asset.category.name}
        - Marque actuelle : ${asset.brand}
        - Prix d'achat initial : ${asset.price} EUR
        - Date d'achat : ${asset.purchase_date.toDateString()}

        Nos fournisseurs enregistrés sont : ${suppliersList}.

        Propose 3 alternatives modernes et haut de gamme pour remplacer cet actif. 
        Pour chaque alternative, précise :
        1. Modèle et Marque suggérés.
        2. Avantages (écologique, technologique, design).
        3. Lequel de nos fournisseurs est le plus apte à fournir cet article.
        
        Réponds en format JSON structuré.
        `;

        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        return JSON.parse(response.text());
    }
}
