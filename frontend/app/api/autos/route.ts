import { NextResponse } from "next/server";
import { requireAuth, getCurrentUsername, proxyFetch } from "@/lib/server-auth";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const qs = new URLSearchParams();
  const clienteId = searchParams.get("clienteId");
  const search     = searchParams.get("search");
  if (clienteId) qs.set("clienteId", clienteId);
  if (search)    qs.set("search", search);

  const res  = await proxyFetch(`/api/autos?${qs}`);
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const username = await getCurrentUsername();
  const body = await request.json();
  const res = await proxyFetch("/api/autos", {
    method: "POST",
    body: JSON.stringify({ ...body, username }),
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
