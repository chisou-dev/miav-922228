import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { requireAdmin } from "@/lib/firebase/requireAdmin";
import {
  CONTACT_COLLECTION,
  isContactStatus,
  type ContactMessage,
} from "@/lib/contact/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const snapshot = await getAdminFirestore()
    .collection(CONTACT_COLLECTION)
    .orderBy("createdAt", "desc")
    .get();

  const messages: ContactMessage[] = snapshot.docs.map((doc) => {
    const data = doc.data();
    const createdAt = data.createdAt?.toDate?.()
      ? data.createdAt.toDate().toISOString()
      : new Date(0).toISOString();

    return {
      id: doc.id,
      name: typeof data.name === "string" ? data.name : "",
      email: typeof data.email === "string" ? data.email : "",
      message: typeof data.message === "string" ? data.message : "",
      status: isContactStatus(data.status) ? data.status : "unread",
      createdAt,
    };
  });

  return NextResponse.json({ messages });
}
