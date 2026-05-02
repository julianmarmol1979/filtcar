import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, USER_COOKIE, ROLE_COOKIE } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
const AUTH_SECRET = process.env.AUTH_SECRET ?? "";

export async function POST(request: Request) {
  const body = await request.json();

  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return NextResponse.json({ message: "Credenciales incorrectas" }, { status: 401 });
  }

  const user = await res.json();
  const jar = await cookies();

  jar.set(SESSION_COOKIE, AUTH_SECRET, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  jar.set(USER_COOKIE, user.username, { httpOnly: true, sameSite: "lax", path: "/" });
  jar.set(ROLE_COOKIE, user.rol, { httpOnly: true, sameSite: "lax", path: "/" });

  return NextResponse.json(user);
}
