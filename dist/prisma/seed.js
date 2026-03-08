"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const argon2 = __importStar(require("argon2"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🚀 Démarrage du peuplement de la base de données...');
    const password = await argon2.hash('RoyalMansour2026!');
    const adminEmail = 'admin@royalmansour.ma';
    await prisma.user.upsert({
        where: { email: adminEmail },
        update: {},
        create: {
            name: 'Direction Générale',
            email: adminEmail,
            password,
            role: client_1.UserRole.ADMIN,
        },
    });
    const auditEmail = 'audit@royalmansour.ma';
    await prisma.user.upsert({
        where: { email: auditEmail },
        update: {},
        create: {
            name: 'Jean Auditeur',
            email: auditEmail,
            password,
            role: client_1.UserRole.AUDITOR,
        },
    });
    const categories = ['Mobilier', 'Luminaire', 'Électronique', 'Tapisserie'];
    const catMap = new Map();
    for (const name of categories) {
        const cat = await prisma.category.upsert({
            where: { name },
            update: {},
            create: { name },
        });
        catMap.set(name, cat.id);
    }
    const suppliers = [
        { name: 'Artisanat du Maroc', email: 'contact@artisanat.ma' },
        { name: 'Fendi Casa', email: 'info@fendicasa.it' },
        { name: 'Roche Bobois', email: 'sales@roche-bobois.fr' },
    ];
    const supMap = new Map();
    for (const s of suppliers) {
        const sup = await prisma.supplier.findFirst({ where: { name: s.name } });
        if (sup) {
            supMap.set(s.name, sup.id);
        }
        else {
            const newSup = await prisma.supplier.create({
                data: { name: s.name, contact_email: s.email },
            });
            supMap.set(s.name, newSup.id);
        }
    }
    let hotel = await prisma.location.findFirst({ where: { name: 'Hôtel Royal Mansour Casablanca' } });
    if (!hotel) {
        hotel = await prisma.location.create({
            data: { name: 'Hôtel Royal Mansour Casablanca', type: client_1.LocationType.HOTEL },
        });
    }
    const createLocation = async (name, type, parentId) => {
        let loc = await prisma.location.findFirst({ where: { name, parent_id: parentId } });
        if (!loc) {
            loc = await prisma.location.create({
                data: { name, type, parent_id: parentId },
            });
        }
        return loc;
    };
    const rdc = await createLocation('Rez-de-chaussée', client_1.LocationType.FLOOR, hotel.id);
    const etage1 = await createLocation('1er Étage', client_1.LocationType.FLOOR, hotel.id);
    const sousSol = await createLocation('Sous-sol (Zone Technique)', client_1.LocationType.FLOOR, hotel.id);
    const lobby = await createLocation('Lobby Principal', client_1.LocationType.ZONE, rdc.id);
    const suite101 = await createLocation('Suite Royale 101', client_1.LocationType.ZONE, etage1.id);
    const spa = await createLocation('Spa & Bien-être', client_1.LocationType.ZONE, etage1.id);
    const assetsToCreate = [
        {
            tag_id: 'RFID-001',
            name: 'Lustre motorisé Cristal Baccarat',
            brand: 'Baccarat',
            model: 'Zenith 48L',
            price: 15000,
            purchase_date: new Date(new Date().setFullYear(new Date().getFullYear() - 3)),
            category: 'Luminaire',
            supplier: 'Artisanat du Maroc',
            location: lobby.id,
        },
        {
            tag_id: 'RFID-002',
            name: 'Canapé en velours de soie',
            brand: 'Fendi Casa',
            model: 'Constellation',
            price: 8000,
            purchase_date: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
            category: 'Tapisserie',
            supplier: 'Fendi Casa',
            location: suite101.id,
        },
        {
            tag_id: 'RFID-003',
            name: 'Serveur IT Centralization',
            brand: 'Dell',
            model: 'PowerEdge R740',
            price: 5000,
            purchase_date: new Date(new Date().setFullYear(new Date().getFullYear() - 4)),
            category: 'Électronique',
            supplier: 'Roche Bobois',
            location: sousSol.id,
        },
        {
            tag_id: 'RFID-004',
            name: 'Table basse en cèdre sculpté',
            brand: 'Artisanat Local',
            model: 'Marrakech Custom',
            price: 2500,
            purchase_date: new Date(),
            category: 'Mobilier',
            supplier: 'Artisanat du Maroc',
            location: lobby.id,
        },
        {
            tag_id: 'RFID-005',
            name: 'Écran LED Miroir',
            brand: 'Samsung',
            model: 'The Frame 2024',
            price: 3500,
            purchase_date: new Date(new Date().setFullYear(new Date().getFullYear() - 2)),
            category: 'Électronique',
            supplier: 'Roche Bobois',
            location: spa.id,
        },
    ];
    for (const a of assetsToCreate) {
        await prisma.asset.upsert({
            where: { tag_id: a.tag_id },
            update: {},
            create: {
                tag_id: a.tag_id,
                name: a.name,
                brand: a.brand,
                model: a.model,
                price: a.price,
                purchase_date: a.purchase_date,
                status: client_1.AssetStatus.GOOD,
                category_id: catMap.get(a.category),
                supplier_id: supMap.get(a.supplier),
                location_id: a.location,
            },
        });
    }
    console.log('✅ Base de données peuplée avec succès !');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map