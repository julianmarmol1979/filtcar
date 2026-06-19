import { NextResponse } from "next/server";
import { requireAuth, getCurrentUsername, proxyFetch } from "@/lib/server-auth";

export async function PATCH(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const username = await getCurrentUsername();
  const body = await request.json();

  const res = await proxyFetch("/api/auth/cambiar-password", {
    method: "PATCH",
    body: JSON.stringify({ ...body, username }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Error al cambiar contraseña" }));
    return NextResponse.json(err, { status: res.status });
  }

  return NextResponse.json({ ok: true });
}
