import { beforeEach, describe, expect, it } from "vitest";
import { clearCookies, setSession } from "../helpers/cookies";
import { mockFetchJson } from "../helpers/mockFetch";
import { GET } from "@/app/api/licencia/route";

describe("/api/licencia", () => {
  beforeEach(() => clearCookies());

  it("requires auth", async () => {
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("any authenticated role can check license status", async () => {
    setSession("vendedor1", "EmpleadoVentas");
    const fetchMock = mockFetchJson({ plan: "Premium", bloqueada: false });

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.bloqueada).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith("http://backend.test/api/licencia", expect.anything());
  });
});
