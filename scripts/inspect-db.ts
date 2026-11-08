import "dotenv/config";
import { prisma } from "../src/server/db";

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true, peopleId: true, name: true, status: true },
  });
  console.log("=== USERS IN DB ===");
  console.table(users);

  const people = await prisma.people.findMany({
    select: { id: true, name: true, email: true, pin: true, active: true },
  });
  console.log("=== PEOPLE IN DB ===");
  console.table(people);

  const recordTypes = await prisma.recordType.findMany({
    select: { id: true, key: true, name: true, active: true, systemType: true },
    orderBy: { name: "asc" },
  });
  console.log("=== RECORD TYPES IN DB ===");
  console.table(recordTypes);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
