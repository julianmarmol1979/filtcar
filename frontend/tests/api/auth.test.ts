import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearCookies, setSession } from "../helpers/cookies";
import { mockFetchJson } from "../helpers/mockFetch";
import { cookieStore } from "../setup";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as me } from "@/app/api/auth/me/route";
import { PATCH as cambiarPassword } from "@/app/api/auth/cambiar-password/route";
import { POST as subirFoto } from "@/app/api/auth/foto/route";
import { SESSION_COOKIE, USER_COOKIE, ROLE_COOKIE } from "@/lib/auth";

function req(url: string, init?: RequestInit) {
  return new Request(url, init);
}

describe("/api/auth/login", () => {
  beforeEach(() => clearCookies());

  it("valid credentials sets session cookies and returns user", async () => {
    mockFetchJson({ username: "admin", rol: "Admin", fotoUrl: null });

    const res = await login(req("http://test/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "admin", password: "secret" }),
    }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.username).toBe("admin");
    expect(cookieStore.get(SESSION_COOKIE)).toBe("test-secret");
    expect(cookieStore.get(USER_COOKIE)).toBe("admin");
    expect(cookieStore.get(ROLE_COOKIE)).toBe("Admin");
  });

  it("invalid credentials returns 401 without setting cookies", async () => {
    mockFetchJson({ message: "no" }, 401);

    const res = await login(req("http://test/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "admin", password: "wrong" }),
    }));

    expect(res.status).toBe(401);
    expect(cookieStore.has(SESSION_COOKIE)).toBe(false);
  });
});

describe("/api/auth/logout", () => {
  it("clears all session cookies", async () => {
    setSession("admin");
    const res = await logout();
    const data = await res.json();

    expect(data.ok).toBe(true);
    expect(cookieStore.has(SESSION_COOKIE)).toBe(false);
    expect(cookieStore.has(USER_COOKIE)).toBe(false);
    expect(cookieStore.has(ROLE_COOKIE)).toBe(false);
  });
});

describe("/api/auth/me", () => {
  beforeEach(() => clearCookies());

  it("no session cookie returns 401", async () => {
    const res = await me();
    expect(res.status).toBe(401);
  });

  it("valid session returns username/rol/fotoUrl", async () => {
    setSession("admin", "EmpleadoAdmin", "http://x/foto.png");

    const res = await me();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ username: "admin", rol: "EmpleadoAdmin", fotoUrl: "http://x/foto.png" });
  });
});

describe("/api/auth/cambiar-password", () => {
  beforeEach(() => clearCookies());

  it("requires auth", async () => {
    const res = await cambiarPassword(req("http://test/api/auth/cambiar-password", { method: "PATCH", body: "{}" }));
    expect(res.status).toBe(401);
  });

  it("injects username and forwards backend error", async () => {
    setSession("admin");
    mockFetchJson({ message: "La contraseña actual es incorrecta" }, 400);

    const res = await cambiarPassword(req("http://test/api/auth/cambiar-password", {
      method: "PATCH",
      body: JSON.stringify({ passwordActual: "x", passwordNueva: "y" }),
    }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.message).toContain("incorrecta");
  });

  it("success returns ok:true", async () => {
    setSession("admin");
    mockFetchJson({}, 200);

    const res = await cambiarPassword(req("http://test/api/auth/cambiar-password", {
      method: "PATCH",
      body: JSON.stringify({ passwordActual: "x", passwordNueva: "newpassword1" }),
    }));
    const data = await res.json();

    expect(data.ok).toBe(true);
  });
});

describe("/api/auth/foto", () => {
  beforeEach(() => {
    clearCookies();
    vi.unstubAllGlobals();
  });

  it("requires auth", async () => {
    const res = await subirFoto(req("http://test/api/auth/foto", { method: "POST", body: new FormData() }));
    expect(res.status).toBe(401);
  });

  it("missing file returns 400", async () => {
    setSession("admin");
    const res = await subirFoto(req("http://test/api/auth/foto", { method: "POST", body: new FormData() }));
    expect(res.status).toBe(400);
  });

  it("success sets foto cookie and returns fotoUrl", async () => {
    setSession("admin");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ fotoUrl: "https://storage.test/avatar.png" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const form = new FormData();
    form.set("foto", new File(["fake"], "avatar.png", { type: "image/png" }));

    const res = await subirFoto(req("http://test/api/auth/foto", { method: "POST", body: form }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.fotoUrl).toBe("https://storage.test/avatar.png");
    expect(fetchMock).toHaveBeenCalledWith("http://backend.test/api/auth/foto", expect.objectContaining({ method: "POST" }));
  });

  it("backend error is forwarded", async () => {
    setSession("admin");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ message: "Error al subir a Supabase: boom" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const form = new FormData();
    form.set("foto", new File(["fake"], "avatar.png", { type: "image/png" }));

    const res = await subirFoto(req("http://test/api/auth/foto", { method: "POST", body: form }));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.message).toContain("Supabase");
  });
});
