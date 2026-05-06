import { NextResponse } from "next/server";
import { requireAuth, proxyFetch } from "@/lib/server-auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const res    = await proxyFetch(`/api/clientes/${id}/historial`);
  const data   = await res.json();
  return NextResponse.json(data, { status: res.status });
}
