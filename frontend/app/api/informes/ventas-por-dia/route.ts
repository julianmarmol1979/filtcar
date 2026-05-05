import { NextResponse } from "next/server";
import { requireAuth, proxyFetch } from "@/lib/server-auth";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const qs = searchParams.toString();
  const res = await proxyFetch(`/api/informes/ventas-por-dia${qs ? `?${qs}` : ""}`);
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
