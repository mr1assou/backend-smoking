/**
 * Copy row data from Aiven → Render after schema exists on both
 * (run `prisma migrate deploy` against Render first).
 *
 *   TARGET_DATABASE_URL=... node scripts/copy-pg-data-to-render.mjs
 */
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
process.chdir(join(__dirname, ".."));
dotenv.config();

const sourceUrl = process.env.SOURCE_DATABASE_URL ?? process.env.DATABASE_URL;
const targetUrl = process.env.TARGET_DATABASE_URL;

if (!sourceUrl || !targetUrl) {
  console.error("Need DATABASE_URL (source) and TARGET_DATABASE_URL");
  process.exit(1);
}

function stripSslParams(raw) {
  const url = new URL(raw);
  for (const key of ["sslmode", "sslrootcert", "sslcert", "sslkey", "uselibpqcompat"]) {
    url.searchParams.delete(key);
  }
  return url.toString();
}

function q(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

const source = new pg.Pool({
  connectionString: stripSslParams(sourceUrl),
  ssl: { rejectUnauthorized: true },
  max: 2,
});

const target = new pg.Pool({
  connectionString: stripSslParams(targetUrl),
  ssl: { rejectUnauthorized: true },
  max: 2,
});

async function tables(client) {
  const { rows } = await client.query(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);
  return rows.map((r) => r.tablename);
}

async function main() {
  const src = await source.connect();
  const dst = await target.connect();

  try {
    await src.query("SELECT 1");
    await dst.query("SELECT 1");
    console.log("Connected to source (Aiven) and target (Render).");

    const sourceTables = await tables(src);
    const targetTables = new Set(await tables(dst));
    console.log(`Source tables: ${sourceTables.length}`);
    console.log(`Target tables: ${targetTables.size}`);

    const missing = sourceTables.filter((t) => !targetTables.has(t));
    if (missing.length) {
      throw new Error(
        `Target is missing tables (run prisma migrate deploy first): ${missing.join(", ")}`,
      );
    }

    await dst.query("BEGIN");
    await dst.query("SET LOCAL session_replication_role = replica");

    // Clear target data (keep schema)
    for (const table of [...sourceTables].reverse()) {
      await dst.query(`TRUNCATE TABLE ${q(table)} RESTART IDENTITY CASCADE`);
    }
    console.log("Target tables truncated.");

    for (const table of sourceTables) {
      const { rows } = await src.query(`SELECT * FROM ${q(table)}`);
      if (rows.length === 0) {
        console.log(`  ${table}: 0`);
        continue;
      }

      const columns = Object.keys(rows[0]);
      const colList = columns.map(q).join(", ");
      const batchSize = 150;
      let n = 0;

      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const values = [];
        const placeholders = batch.map((row, ri) => {
          const cells = columns.map((col, ci) => {
            values.push(row[col]);
            return `$${ri * columns.length + ci + 1}`;
          });
          return `(${cells.join(", ")})`;
        });

        await dst.query(
          `INSERT INTO ${q(table)} (${colList}) VALUES ${placeholders.join(", ")}`,
          values,
        );
        n += batch.length;
      }
      console.log(`  ${table}: ${n}`);
    }

    // Fix sequences
    const { rows: seqs } = await dst.query(`
      SELECT
        s.relname AS seq,
        c.relname AS tbl,
        a.attname AS col
      FROM pg_class s
      JOIN pg_depend d ON d.objid = s.oid AND d.deptype = 'a'
      JOIN pg_class c ON c.oid = d.refobjid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = d.refobjsubid
      WHERE s.relkind = 'S' AND n.nspname = 'public'
    `);

    for (const row of seqs) {
      await dst.query(
        `SELECT setval(quote_ident($1)::regclass, COALESCE((SELECT MAX(${q(row.col)}) FROM ${q(row.tbl)}), 1), true)`,
        [row.seq],
      );
    }
    console.log(`Sequences updated: ${seqs.length}`);

    await dst.query("COMMIT");
    console.log("Data copy complete.");
  } catch (error) {
    try {
      await dst.query("ROLLBACK");
    } catch {
      // ignore
    }
    console.error(error);
    process.exitCode = 1;
  } finally {
    src.release();
    dst.release();
    await source.end();
    await target.end();
  }
}

await main();
