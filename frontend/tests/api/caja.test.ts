import { beforeEach, describe, expect, it } from "vitest";
import { clearCookies, setSession } from "../helpers/cookies";
import { mockFetchJson } from "../helpers/mockFetch";
import { GET, POST } from "@/app/api/caja/route";

function req(url: string, init?: RequestInit) {
  return new Request(url, init);
}

describe("/api/caja", () => {
  beforeEach(() => clearCookies());

  it("GET requires auth", async () => {
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET proxies to backend", async () => {
    setSession("admin");
    const fetchMock = mockFetchJson({ movimientos: [], balance: 0 });
    await GET();
    expect(fetchMock).toHaveBeenCalledWith("http://backend.test/api/caja", expect.anything());
  });

  it("POST requires auth", async () => {
    const res = await POST(req("http://test/api/caja", { method: "POST", body: "{}" }));
    expect(res.status).toBe(401);
  });

  it("POST injects username into body", async () => {
    setSession("admin");
    const fetchMock = mockFetchJson({ id: 1 });
    await POST(req("http://test/api/caja", { method: "POST", body: JSON.stringify({ tipo: "Ingreso", monto: 100 }) }));
    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ tipo: "Ingreso", monto: 100, username: "admin" });
  });
});
