import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { requireHouseholdContext } from "@/server/auth/context";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (!q) {
    return NextResponse.json({ people: [] });
  }

  try {
    const { householdId } = await requireHouseholdContext();

    const people = await prisma.people.findMany({
      where: {
        householdId,
        active: true,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: "asc" },
      take: 20,
    });

    return NextResponse.json({ people });
  } catch (error) {
    console.error("Error searching people:", error);
    return NextResponse.json({ people: [] }, { status: 500 });
  }
}
