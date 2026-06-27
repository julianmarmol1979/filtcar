import { beforeEach, describe, expect, it } from "vitest";
import { clearCookies, setSession } from "../helpers/cookies";
import { mockFetchJson } from "../helpers/mockFetch";
import { GET } from "@/app/api/empleados/route";

function req(url: string) {
  return new Request(url);
}

describe("/api/empleados (lightweight active-list, used by Turnos)", () => {
  beforeEach(() => clearCookies());

  it("requires auth", async () => {
    const res = await GET(req("http://test/api/empleados"));
    expect(res.status).toBe(401);
  });

  it("any authenticated role can list (no admin gate)", async () => {
    setSession("vendedor1", "EmpleadoVentas");
    const fetchMock = mockFetchJson([{ id: 1, nombre: "Juan" }]);

    const res = await GET(req("http://test/api/empleados"));

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith("http://backend.test/api/empleados", expect.anything());
  });

  it("forwards search query", async () => {
    setSession("admin");
    const fetchMock = mockFetchJson([]);
    await GET(req("http://test/api/empleados?search=juan"));
    expect(fetchMock).toHaveBeenCalledWith("http://backend.test/api/empleados?search=juan", expect.anything());
  });
});
