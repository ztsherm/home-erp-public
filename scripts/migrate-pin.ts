import { PGlite } from "@electric-sql/pglite";

async function main() {
  const db = new PGlite("./.pgdata");
  await db.ready;
  await db.exec('ALTER TABLE "People" ADD COLUMN IF NOT EXISTS "pin" TEXT;');
  console.log("Migrated People table with pin column successfully.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
