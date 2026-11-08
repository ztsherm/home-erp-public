import { NextResponse } from "next/server";
import { searchScanTarget } from "@/features/inventory/assistant-queries";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const target = searchParams.get("target") ?? searchParams.get("type") ?? "all";
  try {
    const results = await searchScanTarget(q, target);
    return NextResponse.json(results);
  } catch (error) {
    console.error("Error searching scan targets:", error);
    return NextResponse.json({ items: [], areas: [] }, { status: 500 });
  }
}
