import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, USER_COOKIE, ROLE_COOKIE } from "@/lib/auth";

const AUTH_SECRET = process.env.AUTH_SECRET ?? "";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export async function requireAuth(): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const jar = await cookies();
  const session = jar.get(SESSION_COOKIE);
  if (!session || session.value !== AUTH_SECRET) {
    return { ok: false, response: NextResponse.json({ message: "No autorizado" }, { status: 401 }) };
  }
  return { ok: true };
}

export async function requireAdmin(): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;

  const jar = await cookies();
  const rol = jar.get(ROLE_COOKIE)?.value;
  if (rol !== "Admin") {
    return { ok: false, response: NextResponse.json({ message: "Solo un administrador puede realizar esta acción" }, { status: 403 }) };
  }
  return { ok: true };
}

export async function requireAdminOrEmpleadoAdmin(): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;

  const jar = await cookies();
  const rol = jar.get(ROLE_COOKIE)?.value;
  if (rol !== "Admin" && rol !== "EmpleadoAdmin") {
    return { ok: false, response: NextResponse.json({ message: "No tenés permiso para ver esta sección" }, { status: 403 }) };
  }
  return { ok: true };
}

export async function getCurrentUsername(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(USER_COOKIE)?.value ?? null;
}

export async function proxyFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
}
