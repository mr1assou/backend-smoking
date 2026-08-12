/**
 * Seed fake onboarded users for leaderboard / local testing.
 *
 * Creates rows in:
 *   - users
 *   - quit_attempts (+ attempt_economics_segments)
 *   - user_goals
 *   - user_badges
 *   - freedom_point_ledger
 *
 * Fake accounts are tagged by email domain `@quitify.fake` so they can be purged.
 *
 * Usage (from backend-smoking):
 *   npm run seed:fake-users
 *   npm run seed:fake-users -- --count=100
 *   npm run seed:fake-users -- --purge          # delete prior fake users, then seed 100
 *   npm run seed:fake-users -- --purge-only     # delete prior fake users only
 *   npm run seed:fake-users -- --purge --count=50  # purge then seed 50
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

const FAKE_EMAIL_DOMAIN = "quitify.fake";
const FAKE_USERNAME_PREFIX = "fake_user_";
const DEFAULT_COUNT = 100;
const DEFAULT_PASSWORD = "FakeUser123!";

const COUNTRIES = [
  { code: "us", label: "United States" },
  { code: "ca", label: "Canada" },
  { code: "gb", label: "United Kingdom" },
  { code: "fr", label: "France" },
  { code: "de", label: "Germany" },
  { code: "au", label: "Australia" },
  { code: "br", label: "Brazil" },
  { code: "in", label: "India" },
  { code: "jp", label: "Japan" },
  { code: "mx", label: "Mexico" },
  { code: "ma", label: "Morocco" },
  { code: "es", label: "Spain" },
];

const FIRST_NAMES = [
  "alex", "sam", "jordan", "casey", "taylor", "morgan", "riley", "quinn",
  "avery", "jamie", "cameron", "drew", "skyler", "harper", "rowan", "blake",
  "kai", "noah", "luna", "mia", "leo", "zoe", "eli", "nina", "omar", "sara",
];

const BADGE_LADDER = [
  { id: "first-step", minFp: 0 },
  { id: "rising-quitter", minFp: 15 },
  { id: "craving-crusher", minFp: 35 },
  { id: "two-weeks-free", minFp: 700 },
  { id: "top-rated", minFp: 1200 },
  { id: "top-rated-plus", minFp: 2500 },
  { id: "champion", minFp: 5000 },
];

function connectionStringWithoutSslParams(raw) {
  const url = new URL(raw);
  for (const key of ["sslmode", "sslrootcert", "sslcert", "sslkey", "uselibpqcompat"]) {
    url.searchParams.delete(key);
  }
  return url.toString();
}

function parseArgs(argv) {
  let count = DEFAULT_COUNT;
  let purge = false;

  for (const arg of argv) {
    if (arg === "--purge") {
      purge = true;
      continue;
    }
    const countMatch = arg.match(/^--count=(\d+)$/);
    if (countMatch) {
      count = Math.max(1, Number(countMatch[1]));
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      console.log(`Usage:
  npm run seed:fake-users
  npm run seed:fake-users -- --count=100
  npm run seed:fake-users -- --purge
  npm run seed:fake-users -- --purge --count=50`);
      process.exit(0);
    }
  }

  return { count, purge };
}

function flagUrl(code) {
  return `https://flagcdn.com/w80/${code}.png`;
}

function daysAgo(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(8, 0, 0, 0);
  return d;
}

function pick(list, index) {
  return list[index % list.length];
}

function badgesForFp(fp) {
  return BADGE_LADDER.filter((b) => fp >= b.minFp).map((b) => b.id);
}

function fakeEmail(index) {
  return `${FAKE_USERNAME_PREFIX}${String(index).padStart(3, "0")}@${FAKE_EMAIL_DOMAIN}`;
}

function fakeUsername(index) {
  const name = pick(FIRST_NAMES, index);
  return `${FAKE_USERNAME_PREFIX}${name}_${String(index).padStart(3, "0")}`;
}

/** Spread FP so the leaderboard looks varied (roughly 0–5000). */
function freedomPointsForIndex(index, total) {
  const t = total <= 1 ? 1 : index / (total - 1);
  // Mix a smooth curve with a bit of jitter from index.
  const curve = Math.round(4800 * (1 - t) ** 1.35);
  const jitter = (index * 37) % 97;
  return Math.max(0, curve + jitter);
}

const { count, purge } = parseArgs(process.argv.slice(2));

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

const hashedPassword = await argon2.hash(DEFAULT_PASSWORD);

async function purgeFakeUsers() {
  const deleted = await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { endsWith: `@${FAKE_EMAIL_DOMAIN}` } },
        { username: { startsWith: FAKE_USERNAME_PREFIX } },
      ],
    },
  });
  console.log(`Purged ${deleted.count} fake user(s) (cascades attempts/goals/badges/ledger).`);
}

async function seedFakeUsers(total) {
  // Find next free index so re-runs without --purge append instead of colliding.
  const existing = await prisma.user.findMany({
    where: { email: { endsWith: `@${FAKE_EMAIL_DOMAIN}` } },
    select: { email: true },
  });
  const usedIndexes = new Set(
    existing.map((row) => {
      const match = row.email.match(new RegExp(`^${FAKE_USERNAME_PREFIX}(\\d+)@`));
      return match ? Number(match[1]) : null;
    }).filter((n) => n != null),
  );

  let nextIndex = 1;
  while (usedIndexes.has(nextIndex)) nextIndex += 1;

  let created = 0;
  const startIndex = nextIndex;

  for (let n = 0; n < total; n += 1) {
    while (usedIndexes.has(nextIndex)) nextIndex += 1;
    const index = nextIndex;
    usedIndexes.add(index);
    nextIndex += 1;

    const country = pick(COUNTRIES, index);
    const fp = freedomPointsForIndex(n, total);
    const smokeFreeDays = Math.max(1, Math.round(fp / 40) + ((index * 3) % 11));
    const quitStartedAt = daysAgo(smokeFreeDays);
    const cigarettesPerDay = 8 + (index % 15);
    const cigarettesPerPack = 20;
    const packPrice = String(6 + (index % 10));
    const sex = index % 2 === 0 ? "female" : "male";
    const currency = country.code === "gb" ? "GBP" : country.code === "ca" ? "CAD" : "USD";
    const email = fakeEmail(index);
    const username = fakeUsername(index);
    const badgeIds = badgesForFp(fp);

    const goalTargetDays = [3, 7, 14, 30][index % 4];
    const goalCompleted = smokeFreeDays >= goalTargetDays;

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          username,
          sex,
          country: country.label,
          countryFlag: flagUrl(country.code),
          currency,
          quitDatePreset: "custom",
          quitDate: quitStartedAt,
          streakStart: quitStartedAt,
          cigarettesPerDay,
          cigarettesPerPack,
          packPrice,
          yearsSmoking: String(2 + (index % 20)),
          quitReasons: ["health"],
          motivation: "feel_better",
          priorQuitAttempts: "1-2",
          primaryInterests: ["community"],
          freedomPoints: fp,
          role: "normal",
          status: "active",
          isPremium: index % 17 === 0,
        },
      });

      const attempt = await tx.quitAttempt.create({
        data: {
          user_id: user.user_id,
          attemptNumber: 1,
          startedAt: quitStartedAt,
          cigarettesAvoided: smokeFreeDays * cigarettesPerDay,
          moneySaved:
            Math.round(
              ((smokeFreeDays * cigarettesPerDay) / cigarettesPerPack) *
                Number(packPrice) *
                100,
            ) / 100,
          lifeMinutesGained: smokeFreeDays * cigarettesPerDay * 11,
          durationSeconds: smokeFreeDays * 24 * 60 * 60,
        },
      });

      await tx.attemptEconomicsSegment.create({
        data: {
          attempt_id: attempt.attempt_id,
          effective_from: quitStartedAt,
          cigarettes_per_day: cigarettesPerDay,
          cigarettes_per_pack: cigarettesPerPack,
          pack_price: packPrice,
        },
      });

      await tx.userGoal.create({
        data: {
          user_id: user.user_id,
          attempt_id: attempt.attempt_id,
          type: "smoke_free_days",
          target: goalTargetDays,
          baseline_progress: 0,
          status: goalCompleted ? "completed" : "active",
          started_at: quitStartedAt,
          completed_at: goalCompleted
            ? daysAgo(Math.max(0, smokeFreeDays - goalTargetDays))
            : null,
        },
      });

      // Some users also track cigarettes avoided.
      if (index % 3 === 0) {
        await tx.userGoal.create({
          data: {
            user_id: user.user_id,
            attempt_id: attempt.attempt_id,
            type: "cigarettes_avoided",
            target: cigarettesPerDay * 7,
            baseline_progress: 0,
            status: "active",
            started_at: quitStartedAt,
          },
        });
      }

      for (const badgeId of badgeIds) {
        await tx.userBadge.create({
          data: {
            user_id: user.user_id,
            badge_id: badgeId,
            earned_at: quitStartedAt,
          },
        });
      }

      if (fp > 0) {
        await tx.freedomPointLedger.create({
          data: {
            user_id: user.user_id,
            amount: fp,
            source_type: "seed_fake_user",
            source_key: `fake-user-${index}`,
            earned_at: quitStartedAt,
          },
        });
      }
    });

    created += 1;
    if (created % 20 === 0 || created === total) {
      console.log(`Created ${created}/${total} fake users...`);
    }
  }

  console.log(
    `Done. Seeded ${created} fake user(s) starting at index ${String(startIndex).padStart(3, "0")}.`,
  );
  console.log(`Email pattern: ${FAKE_USERNAME_PREFIX}NNN@${FAKE_EMAIL_DOMAIN}`);
  console.log(`Password for all: ${DEFAULT_PASSWORD}`);
}

try {
  const args = process.argv.slice(2);
  const purgeOnly = args.includes("--purge-only");

  if (purge || purgeOnly) {
    await purgeFakeUsers();
  }

  if (!purgeOnly) {
    await seedFakeUsers(count);
  }
} catch (error) {
  console.error("Fake user seed failed:", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
  await pool.end();
}
