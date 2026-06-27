import { NextResponse } from "next/server";
import { requireAuth, getCurrentUsername, proxyFetch } from "@/lib/server-auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const res  = await proxyFetch(`/api/ordenes/${id}`);
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const username = await getCurrentUsername();
  const { id } = await params;
  const body = await request.json();
  const res = await proxyFetch(`/api/ordenes/${id}`, {
    method: "PUT",
    body: JSON.stringify({ ...body, username }),
  });
  return NextResponse.json({}, { status: res.status });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const username = await getCurrentUsername();
  const { id } = await params;
  const res = await proxyFetch(`/api/ordenes/${id}?username=${encodeURIComponent(username ?? "")}`, { method: "DELETE" });
  return NextResponse.json({}, { status: res.status });
}
