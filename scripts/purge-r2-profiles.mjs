/**
 * Removes all objects under the R2 `profiles/` prefix and clears matching
 * `users.image_url` values. Default avatars are bundled in the mobile app;
 * only user-uploaded photos should live in R2 going forward.
 *
 * Usage (from backend-smoking):
 *   npm run purge:r2-profiles
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
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

const bucket = process.env.R2_BUCKET;
const endpoint = process.env.R2_ENDPOINT;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");

if (!bucket || !endpoint || !accessKeyId || !secretAccessKey || !publicUrl) {
  console.error("Missing R2_* env vars in .env");
  process.exit(1);
}

const client = new S3Client({
  region: "auto",
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
});

const PREFIX = "profiles/";

async function listAllKeys() {
  const keys = [];
  let continuationToken;

  do {
    const page = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: PREFIX,
        ContinuationToken: continuationToken,
      }),
    );

    for (const item of page.Contents ?? []) {
      if (item.Key) keys.push(item.Key);
    }

    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);

  return keys;
}

async function deleteKeys(keys) {
  let deleted = 0;

  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000);
    const result = await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: batch.map((Key) => ({ Key })),
          Quiet: false,
        },
      }),
    );
    deleted += result.Deleted?.length ?? 0;

    for (const error of result.Errors ?? []) {
      console.error(`Failed to delete ${error.Key}: ${error.Code} ${error.Message}`);
    }
  }

  return deleted;
}

const keys = await listAllKeys();
console.log(`Found ${keys.length} object(s) under ${PREFIX}`);

if (keys.length > 0) {
  const deleted = await deleteKeys(keys);
  console.log(`Deleted ${deleted} object(s) from R2`);
} else {
  console.log("Nothing to delete in R2");
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.warn("DATABASE_URL not set — skipped clearing users.image_url");
  process.exit(0);
}

const pool = new pg.Pool({
  connectionString: connectionStringWithoutSslParams(databaseUrl),
  ssl: { rejectUnauthorized: true },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const profileUrlPrefix = `${publicUrl}/${PREFIX}`;
const cleared = await prisma.user.updateMany({
  where: {
    image_url: { startsWith: profileUrlPrefix },
  },
  data: { image_url: null },
});

console.log(`Cleared image_url for ${cleared.count} user(s)`);

await prisma.$disconnect();
await pool.end();
