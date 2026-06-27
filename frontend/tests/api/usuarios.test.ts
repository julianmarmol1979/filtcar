import { beforeEach, describe, expect, it } from "vitest";
import { clearCookies, setSession } from "../helpers/cookies";
import { mockFetchJson } from "../helpers/mockFetch";
import { GET, POST } from "@/app/api/usuarios/route";
import { PUT } from "@/app/api/usuarios/[id]/route";
import { PATCH } from "@/app/api/usuarios/[id]/toggle/route";

function req(url: string, init?: RequestInit) {
  return new Request(url, init);
}

describe("/api/usuarios", () => {
  beforeEach(() => clearCookies());

  it("GET requires auth", async () => {
    const res = await GET(req("http://test/api/usuarios"));
    expect(res.status).toBe(401);
  });

  it("GET forbidden for EmpleadoVentas", async () => {
    setSession("vendedor1", "EmpleadoVentas");
    const res = await GET(req("http://test/api/usuarios"));
    expect(res.status).toBe(403);
  });

  it("GET allowed read-only for EmpleadoAdmin", async () => {
    setSession("coord1", "EmpleadoAdmin");
    const fetchMock = mockFetchJson([]);
    const res = await GET(req("http://test/api/usuarios"));
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith("http://backend.test/api/empleados", expect.anything());
  });

  it("GET allowed for Admin and forwards search", async () => {
    setSession("admin", "Admin");
    const fetchMock = mockFetchJson([]);
    await GET(req("http://test/api/usuarios?search=juan"));
    expect(fetchMock).toHaveBeenCalledWith("http://backend.test/api/empleados?search=juan", expect.anything());
  });

  it("POST forbidden for EmpleadoAdmin (read-only)", async () => {
    setSession("coord1", "EmpleadoAdmin");
    const res = await POST(req("http://test/api/usuarios", { method: "POST", body: "{}" }));
    expect(res.status).toBe(403);
  });

  it("POST allowed for Admin, injects actorUsername", async () => {
    setSession("admin", "Admin");
    const fetchMock = mockFetchJson({ id: 1 });
    await POST(req("http://test/api/usuarios", { method: "POST", body: JSON.stringify({ username: "nuevo" }) }));
    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ username: "nuevo", actorUsername: "admin" });
  });

  it("PUT forbidden for non-admin", async () => {
    setSession("coord1", "EmpleadoAdmin");
    const res = await PUT(req("http://test/api/usuarios/1", { method: "PUT", body: "{}" }), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(403);
  });

  it("PUT allowed for Admin, injects actorUsername and forwards id", async () => {
    setSession("admin", "Admin");
    const fetchMock = mockFetchJson({ id: 1 });
    await PUT(req("http://test/api/usuarios/1", { method: "PUT", body: JSON.stringify({ nombre: "X" }) }), { params: Promise.resolve({ id: "1" }) });
    expect(fetchMock).toHaveBeenCalledWith("http://backend.test/api/empleados/1", expect.objectContaining({ method: "PUT" }));
    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ nombre: "X", actorUsername: "admin" });
  });

  it("toggle forbidden for non-admin", async () => {
    setSession("coord1", "EmpleadoAdmin");
    const res = await PATCH(req("http://test/api/usuarios/1/toggle", { method: "PATCH" }), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(403);
  });

  it("toggle allowed for Admin, sends username as query param", async () => {
    setSession("admin", "Admin");
    const fetchMock = mockFetchJson({ id: 1, activo: false });
    await PATCH(req("http://test/api/usuarios/1/toggle", { method: "PATCH" }), { params: Promise.resolve({ id: "1" }) });
    expect(fetchMock).toHaveBeenCalledWith("http://backend.test/api/empleados/1/toggle?username=admin", expect.objectContaining({ method: "PATCH" }));
  });
});
