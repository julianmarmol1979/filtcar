import { vi } from "vitest";

// In-memory stand-in for Next.js's request cookie jar, shared across a test file.
// Tests populate it via setCookies()/clearCookies() from tests/helpers/cookies.ts.
export const cookieStore = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      cookieStore.has(name) ? { name, value: cookieStore.get(name)! } : undefined,
    set: (name: string, value: string) => {
      cookieStore.set(name, value);
    },
    delete: (name: string) => {
      cookieStore.delete(name);
    },
  }),
}));
