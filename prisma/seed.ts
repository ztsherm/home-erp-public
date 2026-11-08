import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/server/db";

async function main() {
  const adminName = (process.env.INITIAL_ADMIN_NAME ?? "Administrator").trim();
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;
  const adminPin = process.env.INITIAL_ADMIN_PIN?.trim() || null;
  if (!adminEmail) {
    throw new Error("INITIAL_ADMIN_EMAIL must be set before seeding.");
  }
  if (!adminPassword || adminPassword.length < 8) {
    throw new Error("INITIAL_ADMIN_PASSWORD must be set to at least 8 characters before seeding.");
  }
  if (adminPin && !/^\d{4}$/.test(adminPin)) {
    throw new Error("INITIAL_ADMIN_PIN must be exactly 4 digits when set.");
  }
  const adminPasswordHash = await bcrypt.hash(adminPassword, 12);

  const household = await prisma.household.upsert({
    where: { slug: "home" },
    update: {},
    create: { name: "Home", slug: "home" },
  });
  const adminPerson = await prisma.people.upsert({
    where: { id: "seed-people-admin" },
    update: { name: adminName, email: adminEmail, active: true },
    create: { id: "seed-people-admin", householdId: household.id, name: adminName, email: adminEmail },
  });

  const adminByEmail = await prisma.user.findUnique({ where: { email: adminEmail } });
  const adminByPerson = await prisma.user.findUnique({ where: { peopleId: adminPerson.id } });
  if (adminByEmail && adminByPerson && adminByEmail.id !== adminByPerson.id) {
    throw new Error("The initial administrator email and people record belong to different users.");
  }
  const existingAdmin = adminByEmail ?? adminByPerson ?? await prisma.user.findUnique({ where: { email: "admin@homeerp.local" } });
  if (existingAdmin) {
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        householdId: household.id,
        peopleId: adminPerson.id,
        name: adminName,
        email: adminEmail,
        passwordHash: adminPasswordHash,
        role: "ADMINISTRATOR",
        status: "ACTIVE",
      },
    });
  } else {
    await prisma.user.create({
      data: {
        householdId: household.id,
        peopleId: adminPerson.id,
        name: adminName,
        email: adminEmail,
        passwordHash: adminPasswordHash,
        role: "ADMINISTRATOR",
      },
    });
  }
  const recordTypes = [
    { key: "location", icon: "home", name: "Location", description: "Top-level physical places.", fields: [{ key: "name", label: "Name", kind: "FREE_TEXT", required: true }, { key: "notes", label: "Notes", kind: "FREE_TEXT" }] },
    { key: "room", icon: "building", name: "Room", description: "Child record under a location.", fields: [{ key: "location", label: "Location", kind: "RECORD", required: true }, { key: "name", label: "Name", kind: "FREE_TEXT", required: true }, { key: "notes", label: "Notes", kind: "FREE_TEXT" }] },
    { key: "area", icon: "map-pin", name: "Area", description: "Child record under a room where items can reside.", fields: [{ key: "room", label: "Room", kind: "RECORD", required: true }, { key: "name", label: "Name", kind: "FREE_TEXT", required: true }, { key: "notes", label: "Notes", kind: "FREE_TEXT" }] },
    { key: "item", icon: "boxes", name: "Item", description: "Inventory item master record.", fields: [{ key: "name", label: "Name", kind: "FREE_TEXT", required: true }, { key: "brand", label: "Brand", kind: "FREE_TEXT" }, { key: "model", label: "Model", kind: "FREE_TEXT" }, { key: "serial_number", label: "Serial number", kind: "FREE_TEXT" }, { key: "upc", label: "UPC", kind: "FREE_TEXT" }, { key: "status", label: "Status", kind: "LIST" }, { key: "min_quantity", label: "Min Quantity", kind: "INTEGER" }, { key: "target_quantity", label: "Target Quantity", kind: "INTEGER" }, { key: "purchase_price", label: "Purchase Price", kind: "FREE_TEXT" }, { key: "purchase_date", label: "Purchase Date", kind: "DATE" }, { key: "notes", label: "Notes", kind: "FREE_TEXT" }] },
    { key: "item_multi_upc", icon: "barcode", name: "Item Multi-UPC", description: "Secondary and additional UPC barcodes linked to an item.", fields: [{ key: "upc", label: "UPC", kind: "FREE_TEXT", required: true }, { key: "item", label: "Item", kind: "RECORD", required: true }] },
    { key: "file", icon: "file-text", name: "Files", description: "Uploaded files joined to any record or transaction.", fields: [{ key: "name", label: "Name", kind: "FREE_TEXT", required: true }, { key: "file", label: "File", kind: "FREE_TEXT", required: true }, { key: "related_record", label: "Related record", kind: "RECORD", required: true }, { key: "notes", label: "Notes", kind: "FREE_TEXT" }] },
    { key: "item_putaway", icon: "archive", name: "Item Putaway", description: "Transaction records that add item quantity into an area.", fields: [{ key: "item", label: "Item", kind: "RECORD", required: true }, { key: "area", label: "Area", kind: "RECORD", required: true }, { key: "quantity", label: "Quantity", kind: "INTEGER", required: true }, { key: "performed_by", label: "Performed by", kind: "RECORD", required: true }, { key: "notes", label: "Notes", kind: "FREE_TEXT" }, { key: "created_at", label: "Created", kind: "DATE" }] },
    { key: "item_transfer", icon: "truck", name: "Item Transfer", description: "Transaction records that move item quantity between areas.", fields: [{ key: "item", label: "Item", kind: "RECORD", required: true }, { key: "from_item_location", label: "From item location", kind: "RECORD", required: true }, { key: "to_area", label: "To area", kind: "RECORD", required: true }, { key: "quantity", label: "Quantity", kind: "INTEGER", required: true }, { key: "performed_by", label: "Performed by", kind: "RECORD", required: true }, { key: "notes", label: "Notes", kind: "FREE_TEXT" }, { key: "created_at", label: "Created", kind: "DATE" }] },
    { key: "item_consumption", icon: "shopping-cart", name: "Item Consumption", description: "Transaction records that remove consumed item quantity from inventory.", fields: [{ key: "item", label: "Item", kind: "RECORD", required: true }, { key: "item_location", label: "Item location", kind: "RECORD", required: true }, { key: "quantity", label: "Quantity", kind: "INTEGER", required: true }, { key: "performed_by", label: "Performed by", kind: "RECORD", required: true }, { key: "notes", label: "Notes", kind: "FREE_TEXT" }, { key: "created_at", label: "Created", kind: "DATE" }] },
    { key: "item_maintenance", icon: "wrench", name: "Item Maintenance", description: "Transaction records for maintenance activity against items.", fields: [{ key: "item", label: "Item", kind: "RECORD", required: true }, { key: "maintenance_type", label: "Maintenance type", kind: "FREE_TEXT", required: true }, { key: "performed_by", label: "Performed by", kind: "RECORD", required: true }, { key: "vendor", label: "Vendor", kind: "FREE_TEXT" }, { key: "cost", label: "Cost", kind: "INTEGER" }, { key: "next_due_date", label: "Next due date", kind: "DATE" }, { key: "notes", label: "Notes", kind: "FREE_TEXT" }, { key: "created_at", label: "Created", kind: "DATE" }] },
    { key: "item_loan", icon: "handshake", name: "Item Loan", description: "Transaction records for lending items to people.", fields: [{ key: "item", label: "Item", kind: "RECORD", required: true }, { key: "borrower", label: "Borrower", kind: "RECORD", required: true }, { key: "loan_date", label: "Loan date", kind: "DATE", required: true }, { key: "expected_return_date", label: "Expected return date", kind: "DATE" }, { key: "actual_return_date", label: "Actual return date", kind: "DATE" }, { key: "condition_notes", label: "Condition notes", kind: "FREE_TEXT" }, { key: "notes", label: "Notes", kind: "FREE_TEXT" }, { key: "created_at", label: "Created", kind: "DATE" }] },
    { key: "people", icon: "users", name: "People", description: "Household members and personal contacts.", fields: [{ key: "name", label: "Name", kind: "FREE_TEXT", required: true }, { key: "relationship", label: "Relationship", kind: "LIST" }, { key: "login_role", label: "Immediate Family Login Role", kind: "LIST" }, { key: "phone", label: "Phone", kind: "FREE_TEXT" }, { key: "email", label: "Email", kind: "FREE_TEXT" }, { key: "birthday", label: "Birthday", kind: "DATE" }, { key: "employer", label: "Employer", kind: "FREE_TEXT" }, { key: "job_title", label: "Job Title", kind: "FREE_TEXT" }, { key: "interests", label: "Interests", kind: "LIST" }, { key: "notes", label: "Notes", kind: "FREE_TEXT" }] },
  ] as const;
  const itemStatusList = await prisma.appList.upsert({
    where: { householdId_key: { householdId: household.id, key: "item_status" } },
    update: {},
    create: { householdId: household.id, name: "Item Status", key: "item_status", selectionMode: "SINGLE" },
  });
  for (const [index, option] of ["Active", "Missing", "Needs Maintenance", "Archived"].entries()) {
    await prisma.appListOption.upsert({
      where: { listId_value: { listId: itemStatusList.id, value: option.toLowerCase().replaceAll(" ", "_") } },
      update: {},
      create: { householdId: household.id, listId: itemStatusList.id, label: option, value: option.toLowerCase().replaceAll(" ", "_"), position: index },
    });
  }
  const relationshipList = await prisma.appList.upsert({
    where: { householdId_key: { householdId: household.id, key: "people_relationship_type" } },
    update: {},
    create: { householdId: household.id, name: "Relationship Type", key: "people_relationship_type", selectionMode: "SINGLE" },
  });
  let immediateFamilyOptionId: string | null = null;
  for (const [index, option] of ["Immediate Family", "Extended Family", "Friend", "Contractor"].entries()) {
    const opt = await prisma.appListOption.upsert({
      where: { listId_value: { listId: relationshipList.id, value: option.toLowerCase().replaceAll(" ", "_") } },
      update: {},
      create: { householdId: household.id, listId: relationshipList.id, label: option, value: option.toLowerCase().replaceAll(" ", "_"), position: index },
    });
    if (opt.value === "immediate_family") immediateFamilyOptionId = opt.id;
  }
  if (immediateFamilyOptionId) {
    await prisma.people.update({
      where: { id: "seed-people-admin" },
      data: { name: adminName, email: adminEmail, relationshipTypeOptionId: immediateFamilyOptionId, pin: adminPin, active: true },
    });
  }
  const createdTypes = new Map<string, string>();
  for (const config of recordTypes) {
    const recordType = await prisma.recordType.upsert({
      where: { householdId_key: { householdId: household.id, key: config.key } },
      update: { name: config.name, icon: config.icon, description: config.description, systemType: true, editableRecords: !config.key.startsWith("item_") || config.key === "item" },
      create: { householdId: household.id, key: config.key, icon: config.icon, name: config.name, description: config.description, systemType: true, editableRecords: !config.key.startsWith("item_") || config.key === "item" },
    });
    createdTypes.set(config.key, recordType.id);
  }
  for (const config of recordTypes) {
    const recordTypeId = createdTypes.get(config.key)!;
    for (const [position, field] of config.fields.entries()) {
      await prisma.recordField.upsert({
        where: { recordTypeId_key: { recordTypeId, key: field.key } },
        update: { label: field.label, kind: field.kind, required: "required" in field ? field.required : false, position },
        create: {
          householdId: household.id,
          recordTypeId,
          key: field.key,
          label: field.label,
          kind: field.kind,
          required: "required" in field ? field.required : false,
          position,
          listId: field.key === "status" ? itemStatusList.id : undefined,
          relatedRecordTypeId: field.key === "location" ? createdTypes.get("location") : field.key === "room" ? createdTypes.get("room") : field.key === "item" ? createdTypes.get("item") : undefined,
        },
      });
    }
  }
  for (const recordType of await prisma.recordType.findMany({ where: { householdId: household.id } })) {
    await prisma.recordField.upsert({
      where: { recordTypeId_key: { recordTypeId: recordType.id, key: "name" } },
      update: { label: "Name", kind: "FREE_TEXT", required: true, active: true, listId: null, relatedRecordTypeId: null, position: 0 },
      create: { householdId: household.id, recordTypeId: recordType.id, key: "name", label: "Name", kind: "FREE_TEXT", required: true, position: 0 },
    });
  }
}

main()
  .then(() => {
    console.log("Database seeded successfully!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  });
