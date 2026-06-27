import { beforeEach, describe, expect, it } from "vitest";
import { clearCookies, setSession } from "../helpers/cookies";
import { mockFetchJson } from "../helpers/mockFetch";
import { GET as getResumen } from "@/app/api/dashboard/route";
import { GET as getCharts } from "@/app/api/dashboard/charts/route";

describe("/api/dashboard", () => {
  beforeEach(() => clearCookies());

  it("resumen requires auth", async () => {
    const res = await getResumen();
    expect(res.status).toBe(401);
  });

  it("resumen proxies to backend", async () => {
    setSession("admin");
    const fetchMock = mockFetchJson({ ArticulosActivos: 1 });
    await getResumen();
    expect(fetchMock).toHaveBeenCalledWith("http://backend.test/api/dashboard", expect.anything());
  });

  it("charts requires auth", async () => {
    const res = await getCharts();
    expect(res.status).toBe(401);
  });

  it("charts proxies to backend", async () => {
    setSession("admin");
    const fetchMock = mockFetchJson({ VentasPorMes: [] });
    await getCharts();
    expect(fetchMock).toHaveBeenCalledWith("http://backend.test/api/dashboard/charts", expect.anything());
  });
});
