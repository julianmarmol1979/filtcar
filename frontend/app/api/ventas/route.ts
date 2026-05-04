import { NextResponse } from "next/server";
import { requireAuth, proxyFetch, getCurrentUsername } from "@/lib/server-auth";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const query = search ? `?search=${encodeURIComponent(search)}` : "";

  const res = await proxyFetch(`/api/ventas${query}`);
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const username = await getCurrentUsername();
  const body = await request.json();

  const res = await proxyFetch("/api/ventas", {
    method: "POST",
    body: JSON.stringify({ ...body, username }),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
