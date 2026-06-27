import { beforeEach, describe, expect, it } from "vitest";
import { clearCookies, setSession } from "../helpers/cookies";
import { mockFetchJson } from "../helpers/mockFetch";
import { GET, POST } from "@/app/api/proveedores/route";
import { PUT } from "@/app/api/proveedores/[id]/route";
import { PATCH } from "@/app/api/proveedores/[id]/toggle/route";

function req(url: string, init?: RequestInit) {
  return new Request(url, init);
}

describe("/api/proveedores", () => {
  beforeEach(() => clearCookies());

  it("GET requires auth", async () => {
    const res = await GET(req("http://test/api/proveedores"));
    expect(res.status).toBe(401);
  });

  it("GET proxies search query", async () => {
    setSession("admin");
    const fetchMock = mockFetchJson([]);
    await GET(req("http://test/api/proveedores?search=bosch"));
    expect(fetchMock).toHaveBeenCalledWith("http://backend.test/api/proveedores?search=bosch", expect.anything());
  });

  it("POST injects username", async () => {
    setSession("admin");
    const fetchMock = mockFetchJson({ id: 1 });
    await POST(req("http://test/api/proveedores", { method: "POST", body: JSON.stringify({ nombre: "Bosch" }) }));
    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ nombre: "Bosch", username: "admin" });
  });

  it("PUT injects username and id", async () => {
    setSession("admin");
    const fetchMock = mockFetchJson({ id: 4 });
    await PUT(req("http://test/api/proveedores/4", { method: "PUT", body: JSON.stringify({ nombre: "X" }) }), { params: Promise.resolve({ id: "4" }) });
    expect(fetchMock).toHaveBeenCalledWith("http://backend.test/api/proveedores/4", expect.objectContaining({ method: "PUT" }));
  });

  it("PATCH toggle sends username as query param", async () => {
    setSession("admin");
    const fetchMock = mockFetchJson({ id: 4, activo: false });
    await PATCH(req("http://test/api/proveedores/4/toggle", { method: "PATCH" }), { params: Promise.resolve({ id: "4" }) });
    expect(fetchMock).toHaveBeenCalledWith("http://backend.test/api/proveedores/4/toggle?username=admin", expect.objectContaining({ method: "PATCH" }));
  });
});
