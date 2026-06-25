import { NextResponse } from "next/server";
import { requireAuth, getCurrentUsername, proxyFetch } from "@/lib/server-auth";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const username = await getCurrentUsername();
  const { id } = await params;
  const body = await request.json();
  const res = await proxyFetch(`/api/proveedores/${id}`, {
    method: "PUT",
    body: JSON.stringify({ ...body, username }),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
