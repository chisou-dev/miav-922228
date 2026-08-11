import { GET_mine } from "@/features/signals/mineApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return GET_mine(request);
}
