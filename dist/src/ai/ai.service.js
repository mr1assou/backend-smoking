"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
const generative_ai_1 = require("@google/generative-ai");
let AiService = class AiService {
    prisma;
    config;
    genAI;
    model;
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
        const apiKey = this.config.get('GEMINI_API_KEY');
        if (!apiKey || apiKey === "INSERT_YOUR_GEMINI_API_KEY_HERE") {
            console.warn('GEMINI_API_KEY is not configured. AI suggestions will fail.');
            this.genAI = new generative_ai_1.GoogleGenerativeAI('placeholder');
        }
        else {
            this.genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
        }
        this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    }
    async getReplacementSuggestions(assetId) {
        const asset = await this.prisma.asset.findUnique({
            where: { id: assetId },
            include: { category: true, supplier: true },
        });
        if (!asset)
            throw new common_1.NotFoundException('Asset not found');
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
};
exports.AiService = AiService;
exports.AiService = AiService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], AiService);
//# sourceMappingURL=ai.service.js.map