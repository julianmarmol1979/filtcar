import { NextResponse } from "next/server";
import { requireAdmin, proxyFetch } from "@/lib/server-auth";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const qs = new URLSearchParams();
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const page = searchParams.get("page") ?? "1";
  const pageSize = searchParams.get("pageSize") ?? "25";
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);
  qs.set("page", page);
  qs.set("pageSize", pageSize);

  const res = await proxyFetch(`/api/activity-logs?${qs}`);
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
