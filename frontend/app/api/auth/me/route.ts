import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, USER_COOKIE, ROLE_COOKIE } from "@/lib/auth";

const AUTH_SECRET = process.env.AUTH_SECRET ?? "";

export async function GET() {
  const jar = await cookies();
  const session = jar.get(SESSION_COOKIE)?.value;
  const username = jar.get(USER_COOKIE)?.value;
  const rol = jar.get(ROLE_COOKIE)?.value;

  if (!session || session !== AUTH_SECRET || !username) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  return NextResponse.json({ username, rol });
}
