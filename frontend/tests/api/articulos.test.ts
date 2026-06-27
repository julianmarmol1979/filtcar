import { beforeEach, describe, expect, it } from "vitest";
import { clearCookies, setSession } from "../helpers/cookies";
import { mockFetchJson } from "../helpers/mockFetch";
import { GET, POST } from "@/app/api/articulos/route";
import { PUT } from "@/app/api/articulos/[id]/route";
import { PATCH } from "@/app/api/articulos/[id]/toggle/route";

function req(url: string, init?: RequestInit) {
  return new Request(url, init);
}

describe("/api/articulos", () => {
  beforeEach(() => clearCookies());

  it("GET without session returns 401", async () => {
    const res = await GET(req("http://test/api/articulos"));
    expect(res.status).toBe(401);
  });

  it("GET with session proxies to backend with search query", async () => {
    setSession("admin");
    const fetchMock = mockFetchJson([{ id: 1, marca: "Castrol" }]);

    const res = await GET(req("http://test/api/articulos?search=castrol"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual([{ id: 1, marca: "Castrol" }]);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://backend.test/api/articulos?search=castrol",
      expect.objectContaining({ headers: expect.objectContaining({ "Content-Type": "application/json" }) })
    );
  });

  it("GET without search omits query string", async () => {
    setSession("admin");
    const fetchMock = mockFetchJson([]);

    await GET(req("http://test/api/articulos"));

    expect(fetchMock).toHaveBeenCalledWith("http://backend.test/api/articulos", expect.anything());
  });

  it("POST without session returns 401", async () => {
    const res = await POST(req("http://test/api/articulos", { method: "POST", body: "{}" }));
    expect(res.status).toBe(401);
  });

  it("POST injects username from session cookie into body", async () => {
    setSession("juanperez");
    const fetchMock = mockFetchJson({ id: 5 });

    await POST(req("http://test/api/articulos", {
      method: "POST",
      body: JSON.stringify({ marca: "Mahle", modelo: "OC 295" }),
    }));

    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ marca: "Mahle", modelo: "OC 295", username: "juanperez" });
  });

  it("PUT injects username and forwards id in path", async () => {
    setSession("admin");
    const fetchMock = mockFetchJson({ id: 7 });

    await PUT(
      req("http://test/api/articulos/7", { method: "PUT", body: JSON.stringify({ stock: 5 }) }),
      { params: Promise.resolve({ id: "7" }) }
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://backend.test/api/articulos/7",
      expect.objectContaining({ method: "PUT" })
    );
    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ stock: 5, username: "admin" });
  });

  it("PATCH toggle sends username as query param", async () => {
    setSession("admin");
    const fetchMock = mockFetchJson({ id: 7, activo: false });

    await PATCH(
      req("http://test/api/articulos/7/toggle", { method: "PATCH" }),
      { params: Promise.resolve({ id: "7" }) }
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://backend.test/api/articulos/7/toggle?username=admin",
      expect.objectContaining({ method: "PATCH" })
    );
  });
});
