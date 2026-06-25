import { NextResponse } from "next/server";
import { requireAuth, getCurrentUsername, proxyFetch } from "@/lib/server-auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const username = await getCurrentUsername();
  const { id } = await params;
  const body = await request.json();
  const res = await proxyFetch(`/api/turnos/${id}/estado`, {
    method: "PATCH",
    body: JSON.stringify({ ...body, username }),
  });
  return NextResponse.json({}, { status: res.status });
}
