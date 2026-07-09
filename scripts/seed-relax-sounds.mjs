/**
 * Seed relax sounds into R2 + DB, or sync DB from existing R2 audio objects.
 * Cover art is bundled locally in the mobile app under music/images/.
 *
 * Usage (from backend-smoking):
 *   npm run seed:relax-sounds          # upload if local audio exists, else DB sync
 *   npm run seed:relax-sounds:db       # DB sync only (no local files needed)
 *   node scripts/seed-relax-sounds.mjs --upload   # force upload (requires local audio)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

function connectionStringWithoutSslParams(raw) {
  const url = new URL(raw);
  for (const key of ["sslmode", "sslrootcert", "sslcert", "sslkey", "uselibpqcompat"]) {
    url.searchParams.delete(key);
  }
  return url.toString();
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = path.resolve(__dirname, "..");
process.chdir(BACKEND_ROOT);
await import("dotenv/config");

const args = process.argv.slice(2);
const forceUpload = args.includes("--upload");
const forceDbOnly = args.includes("--db-only");

const ROOT = path.resolve(BACKEND_ROOT, "..");
const AUDIO_DIR = path.join(ROOT, "quit-smoking/assets/images/music/audios");

const MANIFEST = [
  { slug: "surea", label: "Surea", description: "Ethereal light and still water.", audioFileName: "surea.wav", sortOrder: 0 },
  { slug: "parallelUniverse", label: "Parallel Universe", description: "Dreamy cosmic atmosphere.", audioFileName: "paralell_universe.wav", sortOrder: 1 },
  { slug: "forestRoad", label: "Forest Road", description: "A peaceful walk through the trees.", audioFileName: "road_in_forest.wav", sortOrder: 2 },
  { slug: "cyberpunk", label: "Cyberpunk", description: "Neon synth to focus your mind.", audioFileName: "cyberpunk.mp3", sortOrder: 3 },
  { slug: "relax", label: "Relax", description: "Classic calm to ease tension.", audioFileName: "relax_music.mp3", sortOrder: 4 },
  { slug: "birds", label: "Birds", description: "Morning birds in a quiet forest.", audioFileName: "birds.mp3", sortOrder: 5 },
  { slug: "calmGame", label: "Calm Game", description: "Soft background music to unwind.", audioFileName: "calm_game_music.mp3", sortOrder: 6 },
  { slug: "chill", label: "Chill", description: "Lo-fi calm for slow evenings.", audioFileName: "chill_music.wav", sortOrder: 7 },
  { slug: "deathSound", label: "Let Go", description: "A gentle pause after a hard moment.", audioFileName: "death_sound.mp3", sortOrder: 8 },
  { slug: "desertDunes", label: "Desert Dunes", description: "Wide open sand and still air.", audioFileName: "Dunes_atmosphere.wav", sortOrder: 9 },
  { slug: "filmScore", label: "Film Score", description: "Cinematic warmth and emotion.", audioFileName: "film_music.wav", sortOrder: 10 },
  { slug: "listen", label: "Listen", description: "Quiet space to breathe and reflect.", audioFileName: "listen.wav", sortOrder: 11 },
  { slug: "lostDiary", label: "Lost Diary", description: "Nostalgic tones for gentle reflection.", audioFileName: "lost_diary.wav", sortOrder: 12 },
  { slug: "midi", label: "MIDI", description: "Retro playful melodies.", audioFileName: "midi_sound.wav", sortOrder: 13 },
  { slug: "surrealism", label: "Surrealism", description: "Dreamlike shapes and soft wonder.", audioFileName: "surrealism.mp3", sortOrder: 14 },
  { slug: "wandering", label: "Wandering", description: "Open road, open mind.", audioFileName: "wandering.wav", sortOrder: 15 },
];

function mimeFor(fileName) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".m4a")) return "audio/mp4";
  if (lower.endsWith(".aac")) return "audio/aac";
  throw new Error(`Unsupported file: ${fileName}`);
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function hasLocalAudio() {
  const sample = path.join(AUDIO_DIR, MANIFEST[0].audioFileName);
  return fs.existsSync(sample);
}

function musicKey(slug, fileName) {
  return `music/${slug}/${fileName}`;
}

function publicUrlForKey(publicUrl, key) {
  return `${publicUrl}/${key}`;
}

const bucket = requireEnv("R2_BUCKET");
const publicUrl = requireEnv("R2_PUBLIC_URL").replace(/\/$/, "");
const client = new S3Client({
  region: "auto",
  endpoint: requireEnv("R2_ENDPOINT"),
  credentials: {
    accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
  },
});

const pool = new pg.Pool({
  connectionString: connectionStringWithoutSslParams(requireEnv("DATABASE_URL")),
  ssl: {
    ca: fs.readFileSync(
      process.env.DATABASE_CA_PATH ?? path.join(BACKEND_ROOT, "certs", "ca.pem"),
      "utf8",
    ),
    rejectUnauthorized: true,
  },
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function putFile(key, filePath, contentType) {
  const body = fs.readFileSync(filePath);
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return publicUrlForKey(publicUrl, key);
}

async function headObject(key) {
  try {
    const result = await client.send(
      new HeadObjectCommand({ Bucket: bucket, Key: key }),
    );
    return result.ContentLength ?? null;
  } catch {
    return null;
  }
}

async function upsertRow(entry, audioUrl, audioMimeType, sizeBytes) {
  await prisma.relaxSound.upsert({
    where: { slug: entry.slug },
    create: {
      slug: entry.slug,
      label: entry.label,
      description: entry.description,
      audio_url: audioUrl,
      audio_mime_type: audioMimeType,
      size_bytes: sizeBytes,
      sort_order: entry.sortOrder,
      is_active: true,
    },
    update: {
      label: entry.label,
      description: entry.description,
      audio_url: audioUrl,
      audio_mime_type: audioMimeType,
      size_bytes: sizeBytes,
      sort_order: entry.sortOrder,
      is_active: true,
    },
  });
}

async function uploadAndSeed() {
  console.log(`Uploading ${MANIFEST.length} relax sound audios to R2…`);

  for (const entry of MANIFEST) {
    const audioPath = path.join(AUDIO_DIR, entry.audioFileName);

    if (!fs.existsSync(audioPath)) {
      throw new Error(
        `Missing audio: ${audioPath}\n` +
          "Restore files under quit-smoking/assets/images/music/audios/ or run:\n" +
          "  npm run seed:relax-sounds:db",
      );
    }

    const audioKey = musicKey(entry.slug, entry.audioFileName);
    const audioMimeType = mimeFor(entry.audioFileName);

    console.log(`→ ${entry.label}`);
    const audioUrl = await putFile(audioKey, audioPath, audioMimeType);
    const sizeBytes = fs.statSync(audioPath).size;

    await upsertRow(entry, audioUrl, audioMimeType, sizeBytes);
  }
}

async function syncDbFromR2() {
  console.log(
    `Syncing ${MANIFEST.length} relax sounds to DB from existing R2 audio…`,
  );

  for (const entry of MANIFEST) {
    const audioKey = musicKey(entry.slug, entry.audioFileName);
    const audioMimeType = mimeFor(entry.audioFileName);

    console.log(`→ ${entry.label}`);
    const sizeBytes = await headObject(audioKey);
    if (sizeBytes == null) {
      throw new Error(
        `Missing in R2: ${audioKey}\n` +
          "Upload files first with local audio present:\n" +
          "  npm run seed:relax-sounds -- --upload",
      );
    }

    await upsertRow(
      entry,
      publicUrlForKey(publicUrl, audioKey),
      audioMimeType,
      sizeBytes,
    );
  }
}

async function main() {
  const useUpload = forceUpload || (!forceDbOnly && hasLocalAudio());

  if (useUpload) {
    await uploadAndSeed();
  } else {
    if (!forceDbOnly && !hasLocalAudio()) {
      console.log(
        "Local audio not found — syncing DB from R2 (already uploaded).\n",
      );
    }
    await syncDbFromR2();
  }

  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
