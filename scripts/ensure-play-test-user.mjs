/**
 * Ensures the Google Play review test account exists with an Argon2-hashed password.
 *
 * Usage (from backend-smoking):
 *   npm run seed:play-test-user
 *
 * Default credentials: test@gmail.com — sign in with email OTP: 123456
 * (Legacy password seed: PLAY_TEST_PASSWORD, default 1234)
 * Override: PLAY_TEST_EMAIL=... PLAY_TEST_PASSWORD=... npm run seed:play-test-user
 */
import { fileURLToPath } from "node:url";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import argon2 from "argon2";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.chdir(path.resolve(__dirname, ".."));
await import("dotenv/config");

function connectionStringWithoutSslParams(raw) {
  const url = new URL(raw);
  for (const key of ["sslmode", "sslrootcert", "sslcert", "sslkey", "uselibpqcompat"]) {
    url.searchParams.delete(key);
  }
  return url.toString();
}

const email = (process.env.PLAY_TEST_EMAIL ?? "test@gmail.com").trim().toLowerCase();
const password = process.env.PLAY_TEST_PASSWORD ?? "1234";

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: connectionStringWithoutSslParams(rawUrl),
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const hashedPassword = await argon2.hash(password);

const existing = await prisma.user.findUnique({ where: { email } });
if (existing) {
  await prisma.user.update({
    where: { email },
    data: { password: hashedPassword },
  });
  console.log(`Updated password hash for existing user: ${email}`);
} else {
  await prisma.user.create({
    data: { email, password: hashedPassword },
  });
  console.log(`Created Play test user: ${email}`);
}

await prisma.$disconnect();
await pool.end();
