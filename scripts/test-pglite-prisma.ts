import pg from "pg";
import { PGlite } from "@electric-sql/pglite";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

async function test() {
  const db = new PGlite("./.pgdata");
  await db.ready;

  const pool = Object.create(pg.Pool.prototype);
  pool.options = {};
  pool.query = async (config: any, values?: any) => {
    await db.ready;
    const text = typeof config === "string" ? config : config.text;
    const params = typeof config === "string" ? values : config.values;
    const rowMode = typeof config === "object" ? config.rowMode : undefined;
    const res = await db.query(text, params, { rowMode });
    return {
      rows: res.rows,
      fields: res.fields,
      rowCount: res.affectedRows ?? res.rows.length,
    };
  };
  pool.connect = async () => ({
    query: pool.query,
    release: () => {},
    on: () => {},
    removeListener: () => {},
  });
  pool.on = () => {};
  pool.removeListener = () => {};
  pool.end = async () => {};

  console.log("pool instanceof pg.Pool:", pool instanceof pg.Pool);

  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const households = await prisma.household.findMany();
  console.log("SUCCESS! Households:", households);
  process.exit(0);
}

test().catch(console.error);
