import { getShellCreateData } from "@/features/inventory/queries";
import { requireCurrentUser } from "@/server/auth/context";

export async function GET() {
  const user = await requireCurrentUser();
  const data = await getShellCreateData(user.householdId);
  return Response.json(data, { headers: { "Cache-Control": "private, no-store" } });
}

