import { beforeEach, describe, expect, it } from "vitest";
import { clearCookies, setSession } from "../helpers/cookies";
import { mockFetchJson } from "../helpers/mockFetch";
import { GET, POST } from "@/app/api/ventas/route";
import { GET as getDetail } from "@/app/api/ventas/[id]/route";

function req(url: string, init?: RequestInit) {
  return new Request(url, init);
}

describe("/api/ventas", () => {
  beforeEach(() => clearCookies());

  it("GET requires auth", async () => {
    const res = await GET(req("http://test/api/ventas"));
    expect(res.status).toBe(401);
  });

  it("GET proxies search query", async () => {
    setSession("admin");
    const fetchMock = mockFetchJson([]);
    await GET(req("http://test/api/ventas?search=garcia"));
    expect(fetchMock).toHaveBeenCalledWith("http://backend.test/api/ventas?search=garcia", expect.anything());
  });

  it("POST injects username", async () => {
    setSession("admin");
    const fetchMock = mockFetchJson({ id: 1 });
    await POST(req("http://test/api/ventas", { method: "POST", body: JSON.stringify({ items: [], formaPago: "Contado" }) }));
    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ items: [], formaPago: "Contado", username: "admin" });
  });

  it("GetDetail requires auth", async () => {
    const res = await getDetail(req("http://test/api/ventas/1"), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(401);
  });

  it("GetDetail proxies id", async () => {
    setSession("admin");
    const fetchMock = mockFetchJson({ id: 1 });
    await getDetail(req("http://test/api/ventas/1"), { params: Promise.resolve({ id: "1" }) });
    expect(fetchMock).toHaveBeenCalledWith("http://backend.test/api/ventas/1", expect.anything());
  });
});
