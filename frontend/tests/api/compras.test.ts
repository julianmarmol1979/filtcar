import { beforeEach, describe, expect, it } from "vitest";
import { clearCookies, setSession } from "../helpers/cookies";
import { mockFetchJson } from "../helpers/mockFetch";
import { GET, POST } from "@/app/api/compras/route";
import { GET as getDetail } from "@/app/api/compras/[id]/route";

function req(url: string, init?: RequestInit) {
  return new Request(url, init);
}

describe("/api/compras", () => {
  beforeEach(() => clearCookies());

  it("GET requires auth", async () => {
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET proxies to backend", async () => {
    setSession("admin");
    const fetchMock = mockFetchJson([]);
    await GET();
    expect(fetchMock).toHaveBeenCalledWith("http://backend.test/api/compras", expect.anything());
  });

  it("POST injects username", async () => {
    setSession("admin");
    const fetchMock = mockFetchJson({ id: 1 });
    await POST(req("http://test/api/compras", { method: "POST", body: JSON.stringify({ proveedorId: 1, items: [] }) }));
    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ proveedorId: 1, items: [], username: "admin" });
  });

  it("GetDetail requires auth", async () => {
    const res = await getDetail(req("http://test/api/compras/1"), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(401);
  });

  it("GetDetail proxies id", async () => {
    setSession("admin");
    const fetchMock = mockFetchJson({ id: 1 });
    await getDetail(req("http://test/api/compras/1"), { params: Promise.resolve({ id: "1" }) });
    expect(fetchMock).toHaveBeenCalledWith("http://backend.test/api/compras/1", expect.anything());
  });
});
