import { NextResponse } from "next/server";
import { requireAuth, getCurrentUsername, proxyFetch } from "@/lib/server-auth";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const qs = new URLSearchParams();
  for (const key of ["clienteId", "autoId", "estado", "from", "to", "search"]) {
    const value = searchParams.get(key);
    if (value) qs.set(key, value);
  }

  const res  = await proxyFetch(`/api/ordenes?${qs}`);
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const username = await getCurrentUsername();
  const body = await request.json();
  const res = await proxyFetch("/api/ordenes", {
    method: "POST",
    body: JSON.stringify({ ...body, username }),
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
