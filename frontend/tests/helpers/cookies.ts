import { cookieStore } from "../setup";
import { SESSION_COOKIE, USER_COOKIE, ROLE_COOKIE, FOTO_COOKIE, type UserRole } from "@/lib/auth";

const AUTH_SECRET = "test-secret"; // matches vitest.config.ts test.env.AUTH_SECRET

export function clearCookies() {
  cookieStore.clear();
}

export function setSession(username: string, rol: UserRole = "Admin", fotoUrl?: string) {
  cookieStore.set(SESSION_COOKIE, AUTH_SECRET);
  cookieStore.set(USER_COOKIE, username);
  cookieStore.set(ROLE_COOKIE, rol);
  if (fotoUrl) cookieStore.set(FOTO_COOKIE, fotoUrl);
}
