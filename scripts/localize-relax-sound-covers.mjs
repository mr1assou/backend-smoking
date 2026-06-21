/**
 * Download relax-sound cover images from R2 into the RN app bundle,
 * then delete cover objects from R2. Safe to re-run: skips files already
 * present locally and ignores covers already removed from R2.
 *
 * Usage (from backend-smoking):
 *   npm run localize:relax-sound-covers
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = path.resolve(__dirname, "..");
process.chdir(BACKEND_ROOT);
await import("dotenv/config");

const ROOT = path.resolve(BACKEND_ROOT, "..");
const IMAGES_DIR = path.join(ROOT, "quit-smoking/assets/images/music/images");

const COVERS = [
  { slug: "parallelUniverse", coverFileName: "paralell_universe.png" },
  { slug: "surea", coverFileName: "surea.png" },
  { slug: "forestRoad", coverFileName: "road_forest.png" },
  { slug: "cyberpunk", coverFileName: "cyberpunk.png" },
  { slug: "relax", coverFileName: "relax_music.png" },
  { slug: "birds", coverFileName: "birds.png" },
  { slug: "calmGame", coverFileName: "game.png" },
  { slug: "chill", coverFileName: "chill.png" },
  { slug: "deathSound", coverFileName: "death.png" },
  { slug: "desertDunes", coverFileName: "desert_atmosphere.png" },
  { slug: "filmScore", coverFileName: "film_movie.png" },
  { slug: "listen", coverFileName: "listen_wave.png" },
  { slug: "lostDiary", coverFileName: "lost_diary.png" },
  { slug: "midi", coverFileName: "midi_sound.png" },
  { slug: "surrealism", coverFileName: "surialism.png" },
  { slug: "wandering", coverFileName: "wandering.png" },
];

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function musicKey(slug, fileName) {
  return `music/${slug}/${fileName}`;
}

const bucket = requireEnv("R2_BUCKET");
const client = new S3Client({
  region: "auto",
  endpoint: requireEnv("R2_ENDPOINT"),
  credentials: {
    accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
  },
});

async function streamToBuffer(body) {
  const chunks = [];
  for await (const chunk of body) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function objectExists(key) {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function main() {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });

  let downloaded = 0;
  let skippedLocal = 0;
  let deletedFromR2 = 0;
  let alreadyGoneFromR2 = 0;

  console.log(`Checking ${COVERS.length} relax-sound cover images…`);

  for (const entry of COVERS) {
    const key = musicKey(entry.slug, entry.coverFileName);
    const dest = path.join(IMAGES_DIR, entry.coverFileName);
    const hasLocal = fs.existsSync(dest);
    const hasRemote = await objectExists(key);

    console.log(`→ ${entry.coverFileName}`);

    if (hasLocal && !hasRemote) {
      console.log("  already local, not in R2 — skipped");
      skippedLocal += 1;
      continue;
    }

    if (hasLocal && hasRemote) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
      console.log("  already local, deleted leftover copy from R2");
      deletedFromR2 += 1;
      continue;
    }

    if (!hasLocal && !hasRemote) {
      throw new Error(
        `Missing locally and in R2: ${entry.coverFileName}\n` +
          "Restore the PNG under quit-smoking/assets/images/music/images/ " +
          "or re-upload covers to R2 first.",
      );
    }

    const result = await client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key }),
    );
    const buffer = await streamToBuffer(result.Body);
    fs.writeFileSync(dest, buffer);

    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    console.log("  downloaded and deleted from R2");
    downloaded += 1;
    deletedFromR2 += 1;
  }

  alreadyGoneFromR2 = skippedLocal;

  console.log(
    `Done. downloaded=${downloaded}, already local=${alreadyGoneFromR2}, deleted from R2=${deletedFromR2}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
