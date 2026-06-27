import { beforeEach, describe, expect, it } from "vitest";
import { clearCookies, setSession } from "../helpers/cookies";
import { mockFetchJson } from "../helpers/mockFetch";
import { GET } from "@/app/api/deudas/route";
import { POST as pagar } from "@/app/api/deudas/[id]/pagar/route";

function req(url: string, init?: RequestInit) {
  return new Request(url, init);
}

describe("/api/deudas", () => {
  beforeEach(() => clearCookies());

  it("GET requires auth", async () => {
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET proxies to backend", async () => {
    setSession("admin");
    const fetchMock = mockFetchJson([]);
    await GET();
    expect(fetchMock).toHaveBeenCalledWith("http://backend.test/api/deudas", expect.anything());
  });

  it("pagar requires auth", async () => {
    const res = await pagar(req("http://test/api/deudas/1/pagar", { method: "POST", body: "{}" }), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(401);
  });

  it("pagar injects username and forwards id", async () => {
    setSession("admin");
    const fetchMock = mockFetchJson({ saldoPendiente: 0 });
    await pagar(req("http://test/api/deudas/1/pagar", { method: "POST", body: JSON.stringify({ monto: 100 }) }), { params: Promise.resolve({ id: "1" }) });

    expect(fetchMock).toHaveBeenCalledWith("http://backend.test/api/deudas/1/pagar", expect.objectContaining({ method: "POST" }));
    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ monto: 100, username: "admin" });
  });
});
