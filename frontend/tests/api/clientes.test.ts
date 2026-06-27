import { beforeEach, describe, expect, it } from "vitest";
import { clearCookies, setSession } from "../helpers/cookies";
import { mockFetchJson } from "../helpers/mockFetch";
import { GET, POST } from "@/app/api/clientes/route";
import { PUT } from "@/app/api/clientes/[id]/route";
import { PATCH } from "@/app/api/clientes/[id]/toggle/route";
import { GET as historial } from "@/app/api/clientes/[id]/historial/route";

function req(url: string, init?: RequestInit) {
  return new Request(url, init);
}

describe("/api/clientes", () => {
  beforeEach(() => clearCookies());

  it("GET requires auth", async () => {
    const res = await GET(req("http://test/api/clientes"));
    expect(res.status).toBe(401);
  });

  it("GET proxies search query", async () => {
    setSession("admin");
    const fetchMock = mockFetchJson([]);
    await GET(req("http://test/api/clientes?search=garcia"));
    expect(fetchMock).toHaveBeenCalledWith("http://backend.test/api/clientes?search=garcia", expect.anything());
  });

  it("POST injects username", async () => {
    setSession("admin");
    const fetchMock = mockFetchJson({ id: 1 });
    await POST(req("http://test/api/clientes", { method: "POST", body: JSON.stringify({ nombre: "Juan" }) }));
    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ nombre: "Juan", username: "admin" });
  });

  it("PUT injects username and id", async () => {
    setSession("admin");
    const fetchMock = mockFetchJson({ id: 3 });
    await PUT(req("http://test/api/clientes/3", { method: "PUT", body: JSON.stringify({ nombre: "X" }) }), { params: Promise.resolve({ id: "3" }) });
    expect(fetchMock).toHaveBeenCalledWith("http://backend.test/api/clientes/3", expect.objectContaining({ method: "PUT" }));
  });

  it("PATCH toggle sends username as query param", async () => {
    setSession("admin");
    const fetchMock = mockFetchJson({ id: 3, activo: false });
    await PATCH(req("http://test/api/clientes/3/toggle", { method: "PATCH" }), { params: Promise.resolve({ id: "3" }) });
    expect(fetchMock).toHaveBeenCalledWith("http://backend.test/api/clientes/3/toggle?username=admin", expect.objectContaining({ method: "PATCH" }));
  });

  it("historial requires auth", async () => {
    const res = await historial(req("http://test/api/clientes/3/historial"), { params: Promise.resolve({ id: "3" }) });
    expect(res.status).toBe(401);
  });

  it("historial proxies to backend", async () => {
    setSession("admin");
    const fetchMock = mockFetchJson({ ventas: [], presupuestos: [] });
    await historial(req("http://test/api/clientes/3/historial"), { params: Promise.resolve({ id: "3" }) });
    expect(fetchMock).toHaveBeenCalledWith("http://backend.test/api/clientes/3/historial", expect.anything());
  });
});
