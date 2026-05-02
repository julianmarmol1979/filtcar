import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, USER_COOKIE, ROLE_COOKIE } from "@/lib/auth";

export async function POST() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(USER_COOKIE);
  jar.delete(ROLE_COOKIE);
  return NextResponse.json({ ok: true });
}
