import { NextResponse } from "next/server";
import { requireAdmin, getCurrentUsername, proxyFetch } from "@/lib/server-auth";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const actorUsername = await getCurrentUsername();
  const { id } = await params;
  const body = await request.json();
  const res = await proxyFetch(`/api/empleados/${id}`, {
    method: "PUT",
    body: JSON.stringify({ ...body, actorUsername }),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
