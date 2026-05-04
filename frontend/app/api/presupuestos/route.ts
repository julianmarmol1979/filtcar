import { NextResponse } from "next/server";
import { requireAuth, proxyFetch, getCurrentUsername } from "@/lib/server-auth";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const res = await proxyFetch("/api/presupuestos");
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const username = await getCurrentUsername();
  const body = await request.json();

  const res = await proxyFetch("/api/presupuestos", {
    method: "POST",
    body: JSON.stringify({ ...body, username }),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
