import { prisma } from "@/server/db";
import { requireHouseholdContext } from "@/server/auth/context";
import { inventoryCsv } from "@/features/inventory/csv";

export async function GET(request: Request) {
  const { householdId } = await requireHouseholdContext();
  const search = new URL(request.url).searchParams;
  const status = search.get("status");
  const query = search.get("q")?.trim();
  const contains = query ? { contains: query, mode: "insensitive" as const } : undefined;
  const where = {
    householdId,
    ...(status === "archived" ? { active: false } : status === "all" ? {} : { active: true }),
    ...(contains ? { OR: [{ name: contains }, { description: contains }, { brand: contains }, { model: contains }, { serialNumber: contains }, { upc: contains }] } : {}),
  };
  const items = await prisma.item.findMany({ where, orderBy: { name: "asc" }, select: { id: true, name: true, description: true, brand: true, model: true, serialNumber: true, upc: true, status: true, notes: true, active: true } });
  return new Response(inventoryCsv(items), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="home-erp-inventory-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "private, no-store" } });
}
