import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type RelaxSoundRecord = {
  soundId: number;
  slug: string;
  label: string;
  description: string;
  audioUrl: string;
  audioMimeType: string;
  durationMs: number | null;
  sizeBytes: number | null;
  sortOrder: number;
};

@Injectable()
export class RelaxSoundsRepository {
  constructor(private readonly prisma: PrismaService) {}

  listActive(): Promise<RelaxSoundRecord[]> {
    return this.prisma.relaxSound
      .findMany({
        where: { is_active: true },
        orderBy: [{ sort_order: 'asc' }, { sound_id: 'asc' }],
        select: {
          sound_id: true,
          slug: true,
          label: true,
          description: true,
          audio_url: true,
          audio_mime_type: true,
          duration_ms: true,
          size_bytes: true,
          sort_order: true,
        },
      })
      .then((rows) =>
        rows.map((row) => ({
          soundId: row.sound_id,
          slug: row.slug,
          label: row.label,
          description: row.description,
          audioUrl: row.audio_url,
          audioMimeType: row.audio_mime_type,
          durationMs: row.duration_ms,
          sizeBytes: row.size_bytes,
          sortOrder: row.sort_order,
        })),
      );
  }

  upsert(input: {
    slug: string;
    label: string;
    description: string;
    audioUrl: string;
    audioMimeType: string;
    durationMs?: number;
    sizeBytes?: number;
    sortOrder?: number;
  }): Promise<RelaxSoundRecord> {
    return this.prisma.relaxSound
      .upsert({
        where: { slug: input.slug },
        create: {
          slug: input.slug,
          label: input.label,
          description: input.description,
          audio_url: input.audioUrl,
          audio_mime_type: input.audioMimeType,
          duration_ms: input.durationMs ?? null,
          size_bytes: input.sizeBytes ?? null,
          sort_order: input.sortOrder ?? 0,
          is_active: true,
        },
        update: {
          label: input.label,
          description: input.description,
          audio_url: input.audioUrl,
          audio_mime_type: input.audioMimeType,
          duration_ms: input.durationMs ?? null,
          size_bytes: input.sizeBytes ?? null,
          sort_order: input.sortOrder ?? 0,
          is_active: true,
        },
        select: {
          sound_id: true,
          slug: true,
          label: true,
          description: true,
          audio_url: true,
          audio_mime_type: true,
          duration_ms: true,
          size_bytes: true,
          sort_order: true,
        },
      })
      .then((row) => ({
        soundId: row.sound_id,
        slug: row.slug,
        label: row.label,
        description: row.description,
        audioUrl: row.audio_url,
        audioMimeType: row.audio_mime_type,
        durationMs: row.duration_ms,
        sizeBytes: row.size_bytes,
        sortOrder: row.sort_order,
      }));
  }
}
