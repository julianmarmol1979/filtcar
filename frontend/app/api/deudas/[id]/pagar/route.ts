import { NextResponse } from "next/server";
import { requireAuth, proxyFetch, getCurrentUsername } from "@/lib/server-auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { id }    = await params;
  const username  = await getCurrentUsername();
  const body      = await request.json();

  const res  = await proxyFetch(`/api/deudas/${id}/pagar`, {
    method: "POST",
    body:   JSON.stringify({ ...body, username }),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
