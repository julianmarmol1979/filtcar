import { NextRequest, NextResponse } from "next/server";

const API = process.env.BACKEND_URL ?? "http://localhost:5000";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body   = await req.json();
  const res    = await fetch(`${API}/api/turnos/${id}/estado`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return NextResponse.json({}, { status: res.status });
}
