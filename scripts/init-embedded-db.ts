import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import bcrypt from "bcryptjs";

async function main() {
  const adminName = (process.env.INITIAL_ADMIN_NAME ?? "Administrator").trim();
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;
  const adminPin = process.env.INITIAL_ADMIN_PIN?.trim() || null;
  if (!adminEmail) {
    throw new Error("INITIAL_ADMIN_EMAIL must be set before initializing the database.");
  }
  if (!adminPassword || adminPassword.length < 8) {
    throw new Error("INITIAL_ADMIN_PASSWORD must be set to at least 8 characters before initializing the database.");
  }
  if (adminPin && !/^\d{4}$/.test(adminPin)) {
    throw new Error("INITIAL_ADMIN_PIN must be exactly 4 digits when set.");
  }

  console.log("Initializing local embedded Postgres with PGlite...");
  const db = new PGlite("./.pgdata");
  await db.ready;

  // Check if schema already loaded
  const existingTables = await db.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Household'`);
  if (existingTables.rows.length === 0) {
    const sql = fs.readFileSync("prisma/full-schema.sql", "utf8");
    await db.exec(sql);
    console.log("Database schema initialized successfully.");
  } else {
    console.log("Database schema already exists, skipping DDL.");
  }

  // Run seed data directly in SQL / PGlite
  const adminPasswordHash = await bcrypt.hash(adminPassword, 12);
  
  await db.query(`
    INSERT INTO "Household" ("id", "name", "slug", "createdAt", "updatedAt")
    VALUES ('seed-household-home', 'Home', 'home', NOW(), NOW())
    ON CONFLICT ("slug") DO NOTHING;
  `);

  const householdRes = await db.query<{ id: string }>(`SELECT id FROM "Household" WHERE slug = 'home'`);
  const householdId = householdRes.rows[0]?.id;

  await db.query(`
    INSERT INTO "People" ("id", "householdId", "name", "email", "pin", "createdAt", "updatedAt")
    VALUES ('seed-people-admin', $1, $2, $3, $4, NOW(), NOW())
    ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "email" = EXCLUDED."email", "pin" = EXCLUDED."pin", "updatedAt" = NOW();
  `, [householdId, adminName, adminEmail, adminPin]);

  const relationshipList = await db.query<{ id: string }>(`
    INSERT INTO "AppList" ("id", "householdId", "name", "key", "selectionMode", "createdAt", "updatedAt")
    VALUES ('seed-list-people-relationship', $1, 'People Relationship Type', 'people_relationship_type', 'SINGLE', NOW(), NOW())
    ON CONFLICT ("householdId", "key") DO UPDATE SET "name" = EXCLUDED."name", "active" = true, "updatedAt" = NOW()
    RETURNING "id";
  `, [householdId]);
  const relationshipListId = relationshipList.rows[0]?.id;

  const immediateFamily = await db.query<{ id: string }>(`
    INSERT INTO "AppListOption" ("id", "householdId", "listId", "label", "value", "position", "createdAt", "updatedAt")
    VALUES ('seed-option-immediate-family', $1, $2, 'Immediate Family', 'immediate_family', 0, NOW(), NOW())
    ON CONFLICT ("listId", "value") DO UPDATE SET "label" = EXCLUDED."label", "active" = true, "position" = 0, "updatedAt" = NOW()
    RETURNING "id";
  `, [householdId, relationshipListId]);
  const immediateFamilyOptionId = immediateFamily.rows[0]?.id;

  await db.query(`
    UPDATE "People"
    SET "relationshipTypeOptionId" = $2, "updatedAt" = NOW()
    WHERE "id" = 'seed-people-admin' AND "householdId" = $1;
  `, [householdId, immediateFamilyOptionId]);

  await db.query(`
    INSERT INTO "User" ("id", "householdId", "peopleId", "name", "email", "passwordHash", "role", "status", "createdAt", "updatedAt")
    VALUES ('seed-user-admin', $1, 'seed-people-admin', $2, $3, $4, 'ADMINISTRATOR', 'ACTIVE', NOW(), NOW())
    ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "email" = EXCLUDED."email", "passwordHash" = EXCLUDED."passwordHash", "peopleId" = 'seed-people-admin', "role" = 'ADMINISTRATOR', "status" = 'ACTIVE', "updatedAt" = NOW();
  `, [householdId, adminName, adminEmail, adminPasswordHash]);

  console.log(`Database seeded successfully with admin user: ${adminEmail}`);
}

main().catch(console.error);
