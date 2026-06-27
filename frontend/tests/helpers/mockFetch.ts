import { vi } from "vitest";

// Stubs global fetch (used by proxyFetch and the few routes that call fetch directly)
// to return a canned JSON response, and lets tests inspect how it was called.
export function mockFetchJson(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
