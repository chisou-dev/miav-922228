import { POST_claim } from "@/features/signals/claimApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return POST_claim(request);
}
