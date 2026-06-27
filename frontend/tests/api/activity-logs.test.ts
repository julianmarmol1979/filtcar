import { beforeEach, describe, expect, it } from "vitest";
import { clearCookies, setSession } from "../helpers/cookies";
import { mockFetchJson } from "../helpers/mockFetch";
import { GET } from "@/app/api/activity-logs/route";

function req(url: string) {
  return new Request(url);
}

describe("/api/activity-logs", () => {
  beforeEach(() => clearCookies());

  it("requires auth", async () => {
    const res = await GET(req("http://test/api/activity-logs"));
    expect(res.status).toBe(401);
  });

  it("non-admin role is forbidden", async () => {
    setSession("vendedor1", "EmpleadoVentas");
    const res = await GET(req("http://test/api/activity-logs"));
    expect(res.status).toBe(403);
  });

  it("EmpleadoAdmin is also forbidden (Auditoría is Admin-only)", async () => {
    setSession("coord1", "EmpleadoAdmin");
    const res = await GET(req("http://test/api/activity-logs"));
    expect(res.status).toBe(403);
  });

  it("admin can list and from/to/page/pageSize are forwarded", async () => {
    setSession("admin", "Admin");
    const fetchMock = mockFetchJson({ items: [], total: 0, page: 2, pageSize: 10 });

    const res = await GET(req("http://test/api/activity-logs?from=2026-06-01&to=2026-06-30&page=2&pageSize=10"));

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://backend.test/api/activity-logs?from=2026-06-01&to=2026-06-30&page=2&pageSize=10",
      expect.anything()
    );
  });

  it("defaults page=1 and pageSize=25 when omitted", async () => {
    setSession("admin", "Admin");
    const fetchMock = mockFetchJson({ items: [], total: 0 });

    await GET(req("http://test/api/activity-logs"));

    expect(fetchMock).toHaveBeenCalledWith("http://backend.test/api/activity-logs?page=1&pageSize=25", expect.anything());
  });
});
