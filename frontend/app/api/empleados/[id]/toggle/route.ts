import { NextResponse } from "next/server";
import { requireAdmin, proxyFetch } from "@/lib/server-auth";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const res = await proxyFetch(`/api/empleados/${id}/toggle`, { method: "PATCH" });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
