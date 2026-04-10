import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssetStatus } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { AssetOutputDto } from './dto/asset-output.dto';

@Injectable()
export class AssetsService {
  constructor(private prisma: PrismaService) {}

  async findByTag(tagId: string): Promise<any> {
    const asset = await this.prisma.asset.findUnique({
      where: { tag_id: tagId },
      include: {
        category: true,
        location: true,
        supplier: true,
        movements: {
          include: {
            from_location: true,
            to_location: true,
            user: true,
          },
          orderBy: { moved_at: 'desc' },
        },
        scans: {
          include: {
            user: true,
            location: true,
          },
          orderBy: { scanned_at: 'desc' },
          take: 5,
        },
      },
    });

    if (!asset) {
      throw new NotFoundException(`Asset with tag ${tagId} not found`);
    }

    const mapped = this.mapToOutput(asset);
    return { ...asset, ...mapped };
  }

  async findOne(id: string): Promise<any> {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: {
        category: true,
        location: true,
        supplier: true,
        movements: {
          include: {
            from_location: true,
            to_location: true,
            user: true,
          },
          orderBy: { moved_at: 'desc' },
        },
      },
    });

    if (!asset) {
      throw new NotFoundException(`Asset with id ${id} not found`);
    }

    const mapped = this.mapToOutput(asset);
    return { ...asset, ...mapped };
  }

  async findAll(): Promise<any[]> {
    const assets = await this.prisma.asset.findMany({
      include: {
        category: true,
        location: true,
        supplier: true,
        scans: {
          orderBy: { scanned_at: 'desc' },
          take: 1,
        },
      },
    });

    return assets.map((asset) => this.mapToOutput(asset));
  }

  // Alias public avec filtre de recherche optionnel (appelé par le mobile)
  async findOrphans(query?: string): Promise<any[]> {
    const where: any = { tag_id: null };
    if (query?.trim()) {
      where.name = { contains: query.trim(), mode: 'insensitive' };
    }
    const assets: any[] = await (this.prisma.asset as any).findMany({
      where,
      include: { category: true, location: true },
      orderBy: { created_at: 'desc' },
    });
    return assets.map((asset: any) => ({
      id: asset.id,
      name: asset.name,
      category: asset.category?.name ?? 'Sans catégorie',
      location: asset.location?.name ?? 'Sans localisation',
      brand: asset.brand ?? 'Générique',
      status: asset.status,
    }));
  }

  // Retourne les actifs importés sans tag RFID (en attente d'enrôlement)
  async findUntagged(): Promise<any[]> {
    // Cast nécessaire jusqu'à ce que `npx prisma generate` soit relancé
    // pour que le client Prisma connaisse tag_id nullable + les relations incluses.
    const assets: any[] = await (this.prisma.asset as any).findMany({
      where: { tag_id: null },
      include: {
        category: true,
        location: true,
      },
      orderBy: { created_at: 'desc' },
    });

    return assets.map((asset: any) => ({
      id: asset.id,
      name: asset.name,
      category: asset.category?.name ?? 'Sans catégorie',
      location: asset.location?.name ?? 'Sans localisation',
      brand: asset.brand,
      status: asset.status,
      purchase_year: asset.purchase_date?.getFullYear() ?? null,
      created_at: asset.created_at,
    }));
  }

  // Associe un tag RFID à un actif existant (enrôlement terrain)
  async enrollTag(assetId: string, tagId: string): Promise<any> {
    const trimmedTag = tagId.trim();
    if (!trimmedTag) throw new BadRequestException('tag_id est requis');

    // Vérifier que le tag n'est pas déjà utilisé
    const existing = await this.prisma.asset.findUnique({
      where: { tag_id: trimmedTag },
    });
    if (existing) {
      throw new ConflictException(
        `Le tag "${trimmedTag}" est déjà associé à l'actif "${existing.name}"`,
      );
    }

    // Vérifier que l'actif existe et n'a pas déjà un tag
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
    });
    if (!asset) throw new NotFoundException('Actif introuvable');
    if (asset.tag_id) {
      throw new ConflictException(
        `Cet actif possède déjà le tag "${asset.tag_id}"`,
      );
    }

    const updated = await this.prisma.asset.update({
      where: { id: assetId },
      data: { tag_id: trimmedTag },
      include: { category: true, location: true, supplier: true },
    });

    console.log(
      `Tag "${trimmedTag}" enrôlé sur l'actif "${updated.name}" (${assetId})`,
    );
    return this.mapToOutput(updated);
  }

  async updateAsset(id: string, dto: any): Promise<any> {
    const asset = await this.prisma.asset.findUnique({ where: { id } });
    if (!asset)
      throw new NotFoundException(`Actif avec l'id ${id} introuvable`);

    // Vérification unicité tag_id si modifié
    if (dto.tag_id && dto.tag_id !== asset.tag_id) {
      const existing = await this.prisma.asset.findUnique({
        where: { tag_id: dto.tag_id },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Le tag "${dto.tag_id}" est déjà associé à l'actif "${existing.name}"`,
        );
      }
    }

    // Résolution catégorie par nom
    let categoryId: string | undefined;
    if (dto.category) {
      const cat = await this.prisma.category.upsert({
        where: { name: dto.category.trim() },
        update: {},
        create: { name: dto.category.trim() },
      });
      categoryId = cat.id;
    }

    // Résolution localisation par nom
    let locationId: string | undefined;
    if (dto.location) {
      const loc = await this.prisma.location.findFirst({
        where: { name: dto.location },
      });
      if (!loc) {
        throw new BadRequestException(
          `Localisation "${dto.location}" introuvable`,
        );
      }
      locationId = loc.id;
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.tag_id !== undefined) data.tag_id = dto.tag_id;
    if (dto.brand !== undefined) data.brand = dto.brand;
    if (dto.model !== undefined) data.model = dto.model;
    if (dto.status !== undefined) data.status = this.mapStatus(dto.status);
    if (dto.price !== undefined) data.price = dto.price;
    if (dto.purchase_date !== undefined)
      data.purchase_date = new Date(dto.purchase_date);
    if (dto.warranty_end !== undefined)
      data.warranty_end = dto.warranty_end ? new Date(dto.warranty_end) : null;
    if (categoryId !== undefined) data.category_id = categoryId;
    if (dto.category_id !== undefined) data.category_id = dto.category_id;
    if (locationId !== undefined) data.location_id = locationId;
    if (dto.location_id !== undefined) data.location_id = dto.location_id;
    if (dto.image_url !== undefined) data.image_url = dto.image_url;

    const updated = await this.prisma.asset.update({
      where: { id },
      data,
      include: { category: true, location: true, supplier: true },
    });

    return this.mapToOutput(updated);
  }

  async removeAsset(id: string): Promise<any> {
    const asset = await this.prisma.asset.findUnique({ where: { id } });
    if (!asset)
      throw new NotFoundException(`Actif avec l'id ${id} introuvable`);

    await this.prisma.$transaction(async (tx) => {
      await tx.inventoryTag.deleteMany({ where: { asset_id: id } });
      await tx.assetMovement.deleteMany({ where: { asset_id: id } });
      await tx.scan.deleteMany({ where: { asset_id: id } });
      await tx.alert.deleteMany({ where: { asset_id: id } });
      await tx.assetHistory.deleteMany({ where: { asset_id: id } });
      await tx.asset.delete({ where: { id } });
    });

    return { message: 'Actif supprimé', id, name: asset.name };
  }

  async resetAll() {
    const tables = [
      'asset_movements',
      'scans',
      'alerts',
      'asset_history',
      'assets',
      'locations',
      'categories',
      'reports',
      'suppliers',
    ];

    console.log(
      '--- RESET PARTIEL DE LA BASE DE DONNÉES (hors utilisateurs) ---',
    );

    try {
      for (const table of tables) {
        await this.prisma.$executeRawUnsafe(
          `TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE;`,
        );
      }
      return {
        message: 'Données réinitialisées avec succès (utilisateurs conservés)',
      };
    } catch (error) {
      console.error('Erreur lors du Reset:', error);
      throw new Error('Erreur lors de la réinitialisation : ' + error.message);
    }
  }

  async create(dto: any): Promise<any> {
    // Vérification doublon tag (seulement si tag_id fourni)
    if (dto.tag_id) {
      const existing = await this.prisma.asset.findUnique({
        where: { tag_id: dto.tag_id },
      });
      if (existing) {
        throw new ConflictException('Ce tag RFID est déjà associé à un actif');
      }
    }

    // Résolution catégorie
    let categoryId: string = dto.category_id;
    if (!categoryId && dto.category) {
      const cat = await this.prisma.category.upsert({
        where: { name: dto.category.trim() },
        update: {},
        create: { name: dto.category.trim() },
      });
      categoryId = cat.id;
    }
    if (!categoryId)
      throw new BadRequestException('category_id ou category est requis');

    // Résolution localisation
    let locationId: string = dto.location_id;
    if (!locationId && dto.location) {
      const loc = await this.prisma.location.findFirst({
        where: { name: dto.location },
      });
      if (!loc)
        throw new BadRequestException(
          `Localisation "${dto.location}" introuvable`,
        );
      locationId = loc.id;
    }
    if (!locationId)
      throw new BadRequestException('location_id ou location est requis');

    // Résolution fournisseur
    let supplierId: string = dto.supplier_id;
    if (!supplierId && dto.supplier) {
      const sup = await this.prisma.supplier.findFirst({
        where: { name: dto.supplier },
      });
      if (!sup)
        throw new BadRequestException(
          `Fournisseur "${dto.supplier}" introuvable`,
        );
      supplierId = sup.id;
    }
    if (!supplierId) {
      let defaultSupplier = await this.prisma.supplier.findFirst({
        where: { name: 'Maroc Bureau' },
      });
      if (!defaultSupplier) {
        defaultSupplier = await this.prisma.supplier.create({
          data: {
            name: 'Maroc Bureau',
            contact_email: 'contact@marocbureau.ma',
          },
        });
      }
      supplierId = defaultSupplier.id;
    }

    // Gestion image
    let imageUrl: string | null = null;
    if (dto.image_url) {
      if (dto.image_url.startsWith('data:image')) {
        const matches = dto.image_url.match(
          /^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/,
        );
        if (matches) {
          const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
          const buffer = Buffer.from(matches[2], 'base64');
          const filename = `asset-${uuidv4()}.${ext}`;
          const uploadsDir = path.join(process.cwd(), 'uploads');
          await fs.promises.mkdir(uploadsDir, { recursive: true });
          await fs.promises.writeFile(path.join(uploadsDir, filename), buffer);
          imageUrl = `/uploads/${filename}`;
        }
      } else {
        imageUrl = dto.image_url;
      }
    }

    const asset = await this.prisma.asset.create({
      data: {
        tag_id: dto.tag_id || null,
        name: dto.name,
        category_id: categoryId,
        brand: dto.brand || 'Générique',
        model: dto.model || 'Standard',
        supplier_id: supplierId,
        purchase_date: dto.purchase_date
          ? new Date(dto.purchase_date)
          : new Date(),
        price: dto.price ?? 0,
        warranty_end: dto.warranty_end ? new Date(dto.warranty_end) : null,
        location_id: locationId,
        status: (dto.status as AssetStatus) || AssetStatus.GOOD,
        image_url: imageUrl,
      },
    });

    return this.prisma.asset.findUnique({
      where: { id: asset.id },
      include: { category: true, location: true, supplier: true },
    });
  }

  async importAssets(fileBuffer: Buffer) {
    const xlsx = require('xlsx');
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    const summary = {
      success: 0,
      skipped_no_name: 0,
      errors: [] as any[],
      total: data.length,
    };

    // Localisation racine hôtel
    let mainHotel = await this.prisma.location.findFirst({
      where: { type: 'HOTEL' },
    });
    if (!mainHotel) {
      mainHotel = await this.prisma.location.create({
        data: { name: 'Royal Mansour Marrakech', type: 'HOTEL' },
      });
    }

    // Fournisseur par défaut
    let defaultSupplier = await this.prisma.supplier.findFirst({
      where: { name: 'Maroc Bureau' },
    });
    if (!defaultSupplier) {
      defaultSupplier = await this.prisma.supplier.create({
        data: { name: 'Maroc Bureau', contact_email: 'contact@marocbureau.ma' },
      });
    }

    const admin = await this.prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    for (const [index, row] of data.entries()) {
      try {
        const rawRow = row;
        const r: any = {};
        Object.keys(rawRow).forEach((key) => {
          r[key.toLowerCase().trim()] = rawRow[key];
        });

        const name = (r['nom'] || r['name'])?.toString()?.trim();
        if (!name) {
          summary.skipped_no_name++;
          continue;
        }

        // tag_id peut être null/vide : on l'accepte tel quel
        const raw_tag =
          r['id (tag rfid)'] || r['tag_id'] || r['rfid'] || r['id'];
        const tag_id: string | null = raw_tag?.toString()?.trim() || null;

        const category_name =
          (r['catégorie'] || r['categorie'] || r['category'])
            ?.toString()
            ?.trim() || 'Mobilier';
        const location_name =
          (r['localisation'] || r['location'] || r['emplacement'])
            ?.toString()
            ?.trim() || 'Entrepôt';
        const price =
          parseFloat(r["prix d'achat"] || r['prix'] || r['purchase_price']) ||
          0;
        const purchase_year =
          parseInt(r["année d'achat"] || r['annee'] || r['purchase_year']) ||
          new Date().getFullYear();
        const brand =
          (r['marque'] || r['brand'])?.toString()?.trim() || 'Générique';
        const status_raw = (r['état'] || r['etat'] || r['status'])
          ?.toString()
          ?.trim();
        const status = this.mapStatus(status_raw);

        await this.prisma.$transaction(async (tx) => {
          const category = await tx.category.upsert({
            where: { name: category_name },
            update: {},
            create: { name: category_name },
          });

          let location = await tx.location.findFirst({
            where: { name: location_name },
          });
          if (!location) {
            location = await tx.location.create({
              data: {
                name: location_name,
                type: 'ZONE',
                parent_id: mainHotel?.id,
              },
            });
          }

          const purchaseDate = new Date(purchase_year, 0, 1);

          // Si tag_id connu → upsert sur tag ; sinon → toujours créer
          if (tag_id) {
            await tx.asset.upsert({
              where: { tag_id },
              update: {
                name,
                category_id: category.id,
                location_id: location.id,
                price,
                purchase_date: purchaseDate,
                brand,
                status,
              },
              create: {
                tag_id,
                name,
                category_id: category.id,
                location_id: location.id,
                supplier_id: defaultSupplier.id,
                price,
                purchase_date: purchaseDate,
                brand,
                model: 'Standard',
                status,
              },
            });
          } else {
            // Actif sans tag : on crée directement (pas d'upsert possible)
            await (tx.asset as any).create({
              data: {
                tag_id: null,
                name,
                category_id: category.id,
                location_id: location.id,
                supplier_id: defaultSupplier.id,
                price,
                purchase_date: purchaseDate,
                brand,
                model: 'Standard',
                status,
              },
            });
          }
        });

        summary.success++;
      } catch (error) {
        summary.errors.push({
          line: index + 2,
          message: error.message ?? String(error),
        });
      }
    }

    return summary;
  }

  private mapStatus(raw?: string): AssetStatus {
    if (!raw) return AssetStatus.GOOD;
    const s = raw.toUpperCase();
    if (s.includes('ENDOMMAG') || s === 'DAMAGED') return AssetStatus.DAMAGED;
    if (s.includes('REMPLAC') || s === 'TO_REPLACE')
      return AssetStatus.TO_REPLACE;
    if (s.includes('RÉPAR') || s.includes('REPAR') || s === 'REPAIR')
      return AssetStatus.REPAIR;
    if (s === 'BROKEN' || s.includes('CASS') || s.includes('HS'))
      return AssetStatus.BROKEN;
    return AssetStatus.GOOD;
  }

  private mapToOutput(asset: any): any {
    const netValue = this.calculateNetValue(
      Number(asset.price),
      asset.purchase_date,
    );

    const statusLabels: Record<AssetStatus, string> = {
      [AssetStatus.GOOD]: 'BON ÉTAT',
      [AssetStatus.DAMAGED]: 'ABÎMÉ',
      [AssetStatus.REPAIR]: 'EN RÉPARATION',
      [AssetStatus.BROKEN]: 'HS (CASSÉ)',
      [AssetStatus.TO_REPLACE]: 'À REMPLACER',
    };

    const statusColors: Record<AssetStatus, string> = {
      [AssetStatus.GOOD]: 'emerald',
      [AssetStatus.DAMAGED]: 'amber',
      [AssetStatus.REPAIR]: 'sky',
      [AssetStatus.BROKEN]: 'rose',
      [AssetStatus.TO_REPLACE]: 'rose',
    };

    const price = Number(asset.price);
    const depreciationRate =
      price > 0 ? Math.round(Math.min(100, (1 - netValue / price) * 100)) : 0;

    return {
      id: asset.id,
      tag_id: asset.tag_id ?? null,
      rfid: asset.tag_id ?? null,
      enrollment_pending: asset.tag_id === null,
      name: asset.name,
      category: asset.category?.name ?? 'Sans catégorie',
      location: asset.location?.name ?? 'Sans localisation',
      status: statusColors[asset.status as AssetStatus] ?? 'sky',
      statusLabel: statusLabels[asset.status as AssetStatus] ?? asset.status,
      brand: asset.brand,
      model: asset.model,
      purchase_price: price,
      price: price,
      value: price,
      net_value: `${netValue.toFixed(2)} DH`,
      depreciationRate,
      purchase_year: asset.purchase_date?.getFullYear() ?? null,
      purchase_date: asset.purchase_date,
      warranty_end: asset.warranty_end,
      last_scan: asset.scans?.[0]?.scanned_at ?? null,
      supplier: asset.supplier?.name ?? 'Inconnu',
      movements: (asset.movements ?? []).map((m: any) => ({
        id: m.id,
        date: m.moved_at,
        label: m.from_location_id
          ? "Déplacement d'actif"
          : 'Achat et réception - Entrepôt',
        location: m.to_location?.name ?? 'Inconnu',
        from: m.from_location?.name,
        user: m.user?.name ?? 'Système',
        type: m.from_location_id ? 'movement' : 'purchase',
      })),
      scans: asset.scans ?? [],
    };
  }

  private calculateNetValue(price: number, purchaseDate: Date): number {
    if (!purchaseDate) return price;
    const now = new Date();
    const diffInMs = now.getTime() - purchaseDate.getTime();
    const yearsPassed = diffInMs / (1000 * 60 * 60 * 24 * 365.25);
    return Math.max(0, price - (price / 5) * yearsPassed);
  }

  async getCategories(): Promise<{ id: string; name: string }[]> {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  getTemplate(): Buffer {
    const xlsx = require('xlsx');
    const headers = [
      'ID (TAG RFID)',
      'Nom',
      'Catégorie',
      'État',
      "Prix d'achat",
      'Localisation',
      'Valeur nette',
      'Dernier Scan',
      'Marque',
      "Année d'achat",
    ];
    const worksheet = xlsx.utils.aoa_to_sheet([headers]);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Template');
    return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
}
