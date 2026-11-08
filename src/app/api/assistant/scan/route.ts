import { NextResponse } from "next/server";
import { resolveScanCode } from "@/features/inventory/assistant-queries";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code") ?? searchParams.get("q") ?? "";
  const target = searchParams.get("target") ?? searchParams.get("type") ?? "all";

  if (!code.trim()) {
    return NextResponse.json({ matched: "unknown", code: "" });
  }

  try {
    const result = await resolveScanCode(code, target);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error resolving scan code:", error);
    return NextResponse.json({ matched: "unknown", code: code.trim() }, { status: 500 });
  }
}
