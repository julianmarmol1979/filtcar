import { NextResponse } from "next/server";
import { requireAuth, proxyFetch } from "@/lib/server-auth";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const res  = await proxyFetch("/api/deudas");
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
