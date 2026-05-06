import { NextRequest, NextResponse } from "next/server";

const API = process.env.BACKEND_URL ?? "http://localhost:5000";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body   = await req.json();
  const res    = await fetch(`${API}/api/turnos/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return NextResponse.json({}, { status: res.status });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res    = await fetch(`${API}/api/turnos/${id}`, { method: "DELETE" });
  return NextResponse.json({}, { status: res.status });
}
