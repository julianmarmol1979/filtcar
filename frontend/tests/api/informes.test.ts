import { beforeEach, describe, expect, it } from "vitest";
import { clearCookies, setSession } from "../helpers/cookies";
import { mockFetchJson } from "../helpers/mockFetch";
import { GET as resumen } from "@/app/api/informes/resumen/route";
import { GET as stockBajo } from "@/app/api/informes/stock-bajo/route";
import { GET as topArticulos } from "@/app/api/informes/top-articulos/route";
import { GET as ventasPorDia } from "@/app/api/informes/ventas-por-dia/route";

function req(url: string) {
  return new Request(url);
}

describe("/api/informes", () => {
  beforeEach(() => clearCookies());

  it("resumen requires auth and forwards query string", async () => {
    expect((await resumen(req("http://test/api/informes/resumen?desde=2026-06-01&hasta=2026-06-30"))).status).toBe(401);

    setSession("admin");
    const fetchMock = mockFetchJson({});
    await resumen(req("http://test/api/informes/resumen?desde=2026-06-01&hasta=2026-06-30"));
    expect(fetchMock).toHaveBeenCalledWith("http://backend.test/api/informes/resumen?desde=2026-06-01&hasta=2026-06-30", expect.anything());
  });

  it("stock-bajo requires auth and forwards query string", async () => {
    expect((await stockBajo(req("http://test/api/informes/stock-bajo?umbral=5"))).status).toBe(401);

    setSession("admin");
    const fetchMock = mockFetchJson([]);
    await stockBajo(req("http://test/api/informes/stock-bajo?umbral=5"));
    expect(fetchMock).toHaveBeenCalledWith("http://backend.test/api/informes/stock-bajo?umbral=5", expect.anything());
  });

  it("top-articulos requires auth and forwards query string", async () => {
    expect((await topArticulos(req("http://test/api/informes/top-articulos?desde=2026-06-01&hasta=2026-06-30&top=5"))).status).toBe(401);

    setSession("admin");
    const fetchMock = mockFetchJson([]);
    await topArticulos(req("http://test/api/informes/top-articulos?desde=2026-06-01&hasta=2026-06-30&top=5"));
    expect(fetchMock).toHaveBeenCalledWith("http://backend.test/api/informes/top-articulos?desde=2026-06-01&hasta=2026-06-30&top=5", expect.anything());
  });

  it("ventas-por-dia requires auth and forwards query string", async () => {
    expect((await ventasPorDia(req("http://test/api/informes/ventas-por-dia?desde=2026-06-01&hasta=2026-06-30"))).status).toBe(401);

    setSession("admin");
    const fetchMock = mockFetchJson([]);
    await ventasPorDia(req("http://test/api/informes/ventas-por-dia?desde=2026-06-01&hasta=2026-06-30"));
    expect(fetchMock).toHaveBeenCalledWith("http://backend.test/api/informes/ventas-por-dia?desde=2026-06-01&hasta=2026-06-30", expect.anything());
  });

  it("omits query string when no params given", async () => {
    setSession("admin");
    const fetchMock = mockFetchJson([]);
    await stockBajo(req("http://test/api/informes/stock-bajo"));
    expect(fetchMock).toHaveBeenCalledWith("http://backend.test/api/informes/stock-bajo", expect.anything());
  });
});
