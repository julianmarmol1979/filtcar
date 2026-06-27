import { beforeEach, describe, expect, it } from "vitest";
import { clearCookies, setSession } from "../helpers/cookies";
import { mockFetchJson } from "../helpers/mockFetch";
import { GET, POST } from "@/app/api/turnos/route";
import { PUT, DELETE } from "@/app/api/turnos/[id]/route";
import { PATCH } from "@/app/api/turnos/[id]/estado/route";

function req(url: string, init?: RequestInit) {
  return new Request(url, init);
}

describe("/api/turnos", () => {
  beforeEach(() => clearCookies());

  it("GET requires auth", async () => {
    const res = await GET(req("http://test/api/turnos"));
    expect(res.status).toBe(401);
  });

  it("GET forwards from/to as query params", async () => {
    setSession("admin");
    const fetchMock = mockFetchJson([]);
    await GET(req("http://test/api/turnos?from=2026-06-01&to=2026-06-30"));
    expect(fetchMock).toHaveBeenCalledWith("http://backend.test/api/turnos?from=2026-06-01&to=2026-06-30", expect.anything());
  });

  it("POST injects username", async () => {
    setSession("admin");
    const fetchMock = mockFetchJson({ id: 1 });
    await POST(req("http://test/api/turnos", { method: "POST", body: JSON.stringify({ servicio: "Cambio de aceite" }) }));
    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ servicio: "Cambio de aceite", username: "admin" });
  });

  it("PUT injects username and id", async () => {
    setSession("admin");
    const fetchMock = mockFetchJson({});
    await PUT(req("http://test/api/turnos/5", { method: "PUT", body: JSON.stringify({ servicio: "Filtro" }) }), { params: Promise.resolve({ id: "5" }) });
    expect(fetchMock).toHaveBeenCalledWith("http://backend.test/api/turnos/5", expect.objectContaining({ method: "PUT" }));
  });

  it("DELETE sends username as query param", async () => {
    setSession("admin");
    const fetchMock = mockFetchJson({});
    await DELETE(req("http://test/api/turnos/5", { method: "DELETE" }), { params: Promise.resolve({ id: "5" }) });
    expect(fetchMock).toHaveBeenCalledWith("http://backend.test/api/turnos/5?username=admin", expect.objectContaining({ method: "DELETE" }));
  });

  it("estado PATCH injects username and forwards id", async () => {
    setSession("admin");
    const fetchMock = mockFetchJson({});
    await PATCH(req("http://test/api/turnos/5/estado", { method: "PATCH", body: JSON.stringify({ estado: "Confirmado" }) }), { params: Promise.resolve({ id: "5" }) });
    expect(fetchMock).toHaveBeenCalledWith("http://backend.test/api/turnos/5/estado", expect.objectContaining({ method: "PATCH" }));
    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ estado: "Confirmado", username: "admin" });
  });

  it("requires auth on PUT/DELETE/PATCH", async () => {
    const putRes = await PUT(req("http://test/api/turnos/5", { method: "PUT", body: "{}" }), { params: Promise.resolve({ id: "5" }) });
    const delRes = await DELETE(req("http://test/api/turnos/5", { method: "DELETE" }), { params: Promise.resolve({ id: "5" }) });
    const patchRes = await PATCH(req("http://test/api/turnos/5/estado", { method: "PATCH", body: "{}" }), { params: Promise.resolve({ id: "5" }) });
    expect(putRes.status).toBe(401);
    expect(delRes.status).toBe(401);
    expect(patchRes.status).toBe(401);
  });
});
