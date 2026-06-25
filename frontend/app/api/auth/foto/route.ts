import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireAuth, getCurrentUsername } from "@/lib/server-auth";
import { FOTO_COOKIE } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const username = await getCurrentUsername();
  const incoming = await request.formData();
  const foto = incoming.get("foto");
  if (!foto) {
    return NextResponse.json({ message: "Archivo requerido" }, { status: 400 });
  }

  const outgoing = new FormData();
  outgoing.set("username", username ?? "");
  outgoing.set("foto", foto);

  const res = await fetch(`${API_URL}/api/auth/foto`, {
    method: "POST",
    body: outgoing,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Error al subir la foto" }));
    return NextResponse.json(err, { status: res.status });
  }

  const data = await res.json();
  const jar = await cookies();
  jar.set(FOTO_COOKIE, data.fotoUrl, { httpOnly: true, sameSite: "lax", path: "/" });

  return NextResponse.json(data);
}
