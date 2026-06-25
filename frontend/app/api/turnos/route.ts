import { NextResponse } from "next/server";
import { requireAuth, getCurrentUsername, proxyFetch } from "@/lib/server-auth";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") ?? "";
  const to   = searchParams.get("to") ?? "";
  const qs   = new URLSearchParams();
  if (from) qs.set("from", from);
  if (to)   qs.set("to", to);

  const res = await proxyFetch(`/api/turnos?${qs}`);
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const username = await getCurrentUsername();
  const body = await request.json();
  const res = await proxyFetch("/api/turnos", {
    method: "POST",
    body: JSON.stringify({ ...body, username }),
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
