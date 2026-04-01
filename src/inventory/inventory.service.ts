import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TagClassification } from '@prisma/client';
import { CreateSessionDto } from './dto/create-session.dto';
import { SubmitTagsDto } from './dto/submit-tags.dto';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────────────
  // POST /inventory/sessions
  // Creates a session and returns expected EPCs for the selected location
  // ─────────────────────────────────────────────────────────────────────
  async createSession(dto: CreateSessionDto, userId: string) {
    const location = await this.prisma.location.findUnique({
      where: { id: dto.location_id },
    });
    if (!location) {
      throw new NotFoundException(`Location ${dto.location_id} not found`);
    }

    // Fetch expected EPCs — assets physically assigned to this location
    const expectedAssets = await this.prisma.asset.findMany({
      where: {
        location_id: dto.location_id,
        tag_id: { not: null },
      },
      select: { tag_id: true },
    });

    const session = await this.prisma.inventorySession.create({
      data: {
        user_id: userId,
        location_id: dto.location_id,
        total_expected: expectedAssets.length,
      },
    });

    return {
      sessionId: session.id,
      location: location.name,
      totalExpected: expectedAssets.length,
      expectedEpcs: expectedAssets.map((a) => a.tag_id),
    };
  }

  // ─────────────────────────────────────────────────────────────────────
  // POST /inventory/sessions/:id/tags
  // Processes a batch of scanned tags (50-100 at a time from mobile)
  //
  // Performance strategy:
  //   1. ONE query to fetch all matching assets (bulk)
  //   2. Map-based O(1) lookup for classification
  //   3. ONE query to filter already-seen EPCs
  //   4. Bulk createMany for new InventoryTag rows
  //   5. Bulk asset updates and movement creation in transaction
  // ─────────────────────────────────────────────────────────────────────
  async submitTags(sessionId: string, dto: SubmitTagsDto, userId: string) {
    const session = await this.prisma.inventorySession.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }
    if (session.ended_at) {
      throw new ConflictException('Session already closed');
    }

    const incomingEpcs = dto.tags.map((t) => t.epc);

    // ── Step 1: Filter out already-processed EPCs (DB-level dedup) ──
    const existing = await this.prisma.inventoryTag.findMany({
      where: {
        session_id: sessionId,
        epc_code: { in: incomingEpcs },
      },
      select: { epc_code: true },
    });
    const seenSet = new Set(existing.map((e) => e.epc_code));
    const newTags = dto.tags.filter((t) => !seenSet.has(t.epc));

    if (newTags.length === 0) {
      return { processed: 0, results: [] };
    }

    const newEpcs = newTags.map((t) => t.epc);

    // ── Step 2: Bulk fetch all assets matching these EPCs ───────────
    const assets = await this.prisma.asset.findMany({
      where: { tag_id: { in: newEpcs } },
      select: { id: true, tag_id: true, name: true, location_id: true },
    });

    // O(1) lookup map: epc → asset
    const assetMap = new Map(assets.map((a) => [a.tag_id!, a]));

    // ── Step 3: Classify each tag ───────────────────────────────────
    // Capture from_location_id NOW (before any concurrent batch changes it)
    const rssiMap = new Map(newTags.map((t) => [t.epc, t.rssi ?? null]));

    type ClassifiedTag = {
      epc: string;
      classification: TagClassification;
      asset_id: string | null;
      asset_name: string | null;
      from_location_id: string | null; // Snapshot at classification time
      rssi: number | null;
    };

    const classified: ClassifiedTag[] = newEpcs.map((epc) => {
      const asset = assetMap.get(epc);

      if (!asset) {
        return {
          epc,
          classification: TagClassification.UNKNOWN,
          asset_id: null,
          asset_name: null,
          from_location_id: null,
          rssi: rssiMap.get(epc) ?? null,
        };
      }

      const isExpected = asset.location_id === session.location_id;
      return {
        epc,
        classification: isExpected
          ? TagClassification.EXPECTED
          : TagClassification.UNEXPECTED,
        asset_id: asset.id,
        asset_name: asset.name,
        from_location_id: asset.location_id, // Frozen snapshot
        rssi: rssiMap.get(epc) ?? null,
      };
    });

    // ── Step 4: Bulk insert + side effects in transaction ───────────
    const movements = classified.filter(
      (t) => t.classification === TagClassification.UNEXPECTED && t.asset_id,
    );

    const knownAssetIds = classified
      .filter((t) => t.asset_id)
      .map((t) => t.asset_id!);

    await this.prisma.$transaction(async (tx) => {
      // 4a. Bulk insert InventoryTag rows
      await tx.inventoryTag.createMany({
        data: classified.map((t) => ({
          session_id: sessionId,
          epc_code: t.epc,
          asset_id: t.asset_id,
          classification: t.classification,
          rssi: t.rssi,
        })),
        skipDuplicates: true, // Safety net for race conditions
      });

      // 4b. Update last_scan_at on session
      await tx.inventorySession.update({
        where: { id: sessionId },
        data: { last_scan_at: new Date() },
      });

      // 4c. Create AssetMovement for UNEXPECTED tags (with session_id)
      if (movements.length > 0) {
        await tx.assetMovement.createMany({
          data: movements.map((m) => ({
            asset_id: m.asset_id!,
            from_location_id: m.from_location_id, // Frozen snapshot
            to_location_id: session.location_id,
            user_id: userId,
            session_id: sessionId, // Traceable to this session
          })),
        });

        // 4d. Update asset locations for moved assets (bulk)
        const movedAssetIds = movements.map((m) => m.asset_id!);
        await tx.asset.updateMany({
          where: { id: { in: movedAssetIds } },
          data: { location_id: session.location_id },
        });
      }

      // AssetHistory is created once per asset at session close (not per batch)
      // to avoid write amplification: 10 batches × 50 assets = 500 rows vs 1 per asset
    });

    return {
      processed: classified.length,
      results: classified.map((t) => ({
        epc: t.epc,
        classification: t.classification,
        asset_name: t.asset_name,
      })),
    };
  }

  // ─────────────────────────────────────────────────────────────────────
  // PATCH /inventory/sessions/:id/close
  // Computes final counters and closes the session
  // ─────────────────────────────────────────────────────────────────────
  async closeSession(sessionId: string) {
    const session = await this.prisma.inventorySession.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }
    if (session.ended_at) {
      throw new ConflictException('Session already closed');
    }

    // Single aggregation query — counts by classification
    const counts = await this.prisma.inventoryTag.groupBy({
      by: ['classification'],
      where: { session_id: sessionId },
      _count: true,
    });

    const countMap = new Map(counts.map((c) => [c.classification, c._count]));

    const foundCount = countMap.get(TagClassification.EXPECTED) ?? 0;
    const unexpectedCount = countMap.get(TagClassification.UNEXPECTED) ?? 0;
    const unknownCount = countMap.get(TagClassification.UNKNOWN) ?? 0;
    const totalScanned = foundCount + unexpectedCount + unknownCount;
    const missingCount = session.total_expected - foundCount;

    // Exact count: movements linked to THIS session
    const movementCount = await this.prisma.assetMovement.count({
      where: { session_id: sessionId },
    });

    // Bulk AssetHistory — one entry per scanned asset (not per batch)
    const scannedAssets = await this.prisma.inventoryTag.findMany({
      where: { session_id: sessionId, asset_id: { not: null } },
      select: { asset_id: true },
      distinct: ['asset_id'],
    });
    if (scannedAssets.length > 0) {
      await this.prisma.assetHistory.createMany({
        data: scannedAssets.map((t) => ({
          asset_id: t.asset_id!,
          user_id: session.user_id,
          action: `Inventaire session ${sessionId.slice(0, 8)}`,
        })),
      });
    }

    const updated = await this.prisma.inventorySession.update({
      where: { id: sessionId },
      data: {
        ended_at: new Date(),
        total_scanned: totalScanned,
        found_count: foundCount,
        missing_count: Math.max(0, missingCount),
        unexpected_count: unexpectedCount,
        unknown_count: unknownCount,
        movement_count: movementCount,
      },
      include: {
        user: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
      },
    });

    return {
      session: updated,
      summary: {
        total_scanned: totalScanned,
        total_expected: session.total_expected,
        found: foundCount,
        missing: Math.max(0, missingCount),
        unexpected: unexpectedCount,
        unknown: unknownCount,
        movements: movementCount,
        duration_seconds: Math.round(
          (updated.ended_at!.getTime() - updated.started_at.getTime()) / 1000,
        ),
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────
  // GET /inventory/sessions
  // ─────────────────────────────────────────────────────────────────────
  async findAll() {
    return this.prisma.inventorySession.findMany({
      orderBy: { started_at: 'desc' },
      include: {
        user: { select: { id: true, name: true } },
        location: { select: { id: true, name: true, type: true } },
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────
  // GET /inventory/sessions/:id
  // ─────────────────────────────────────────────────────────────────────
  async findOne(sessionId: string) {
    const session = await this.prisma.inventorySession.findUnique({
      where: { id: sessionId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        location: { select: { id: true, name: true, type: true } },
        tags: {
          orderBy: { scanned_at: 'asc' },
          include: {
            asset: {
              select: {
                id: true,
                name: true,
                brand: true,
                status: true,
                category: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    return session;
  }
}
