import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

async function run() {
  const db = new PGlite("./.pgdata");
  await db.ready;

  // Load schema if not already initialized
  const sql = fs.readFileSync("prisma/full-schema.sql", "utf8");
  await db.exec(sql);

  // Pool proxy for PrismaPg
  const pool = {
    async query(config, values) {
      const text = typeof config === "string" ? config : config.text;
      const params = typeof config === "string" ? values : config.values;
      const rowMode = typeof config === "object" ? config.rowMode : undefined;
      const res = await db.query(text, params, { rowMode });
      return {
        rows: res.rows,
        fields: res.fields,
        rowCount: res.affectedRows ?? res.rows.length,
      };
    },
    async connect() {
      return {
        query: (config, values) => pool.query(config, values),
        release: () => {},
      };
    },
    on: () => {},
    end: async () => {},
  };

  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log("Testing Prisma queries with embedded PGlite...");
  const households = await prisma.household.findMany();
  console.log("Households count:", households.length);

  // Test creating a household
  const created = await prisma.household.upsert({
    where: { slug: "home" },
    update: {},
    create: { name: "Home", slug: "home" },
  });
  console.log("Created/found household:", created.name);
}

run().catch(console.error);
