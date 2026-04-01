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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const uuid_1 = require("uuid");
let AlertsService = class AlertsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(createAlertDto, imageFile) {
        const { asset_id, comment, location_id, status } = createAlertDto;
        const { photo_url } = createAlertDto;
        const type = createAlertDto.type || status;
        if (asset_id) {
            const existingAlert = await this.prisma.alert.findFirst({
                where: {
                    asset_id,
                    status: 'OPEN',
                },
            });
            if (existingAlert) {
                throw new common_1.ConflictException('Un constat est déjà en cours pour cet actif');
            }
        }
        let finalPhotoUrl = photo_url || null;
        const uploadsDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        if (imageFile) {
            const ext = path.extname(imageFile.originalname) || '.jpg';
            const filename = `alert-${(0, uuid_1.v4)()}${ext}`;
            const filepath = path.join(uploadsDir, filename);
            fs.writeFileSync(filepath, imageFile.buffer);
            finalPhotoUrl = `/uploads/${filename}`;
        }
        else if (photo_url && photo_url.startsWith('data:image')) {
            const matches = photo_url.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
                const buffer = Buffer.from(matches[2], 'base64');
                const filename = `alert-${(0, uuid_1.v4)()}.${ext}`;
                const filepath = path.join(uploadsDir, filename);
                fs.writeFileSync(filepath, buffer);
                finalPhotoUrl = `/uploads/${filename}`;
            }
        }
        const alert = await this.prisma.alert.create({
            data: {
                asset_id,
                location_id,
                type,
                comment,
                photo_url: finalPhotoUrl,
                status: 'OPEN',
            },
            include: {
                asset: {
                    include: {
                        category: true,
                        location: true,
                    },
                },
                location: true,
            },
        });
        console.log('Alerte créée avec succès:', alert.id);
        return alert;
    }
    async findAll() {
        return this.prisma.alert.findMany({
            where: {
                status: client_1.AlertStatus.OPEN,
            },
            include: {
                asset: {
                    include: {
                        category: true,
                        location: true,
                    },
                },
            },
            orderBy: {
                created_at: 'desc',
            },
        });
    }
    async updateStatus(id, status) {
        const alert = await this.prisma.alert.findUnique({ where: { id } });
        if (!alert)
            throw new common_1.NotFoundException('Alerte non trouvée');
        return this.prisma.alert.update({
            where: { id },
            data: { status: status },
        });
    }
};
exports.AlertsService = AlertsService;
exports.AlertsService = AlertsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AlertsService);
//# sourceMappingURL=alerts.service.js.map