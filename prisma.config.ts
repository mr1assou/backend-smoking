// Load .env locally when dotenv is installed; Render injects env vars directly.
try {
  require("dotenv/config");
} catch {
  // optional — not needed in production
}

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
