"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, Droplets, KeyRound, Eye, EyeOff } from "lucide-react";
import { APP_VERSION } from "@/lib/version";
import { GlobalSearch } from "@/components/GlobalSearch";

const navItems = [
  { href: "/dashboard",    label: "Dashboard",    icon: "⊞" },
  { href: "/articulos",    label: "Artículos",    icon: "📦", badge: "stockBajo" },
  { href: "/clientes",     label: "Clientes",     icon: "👤" },
  { href: "/proveedores",  label: "Proveedores",  icon: "🏭" },
  { href: "/empleados",    label: "Empleados",    icon: "👷" },
  { href: "/ventas",       label: "Ventas",       icon: "💰" },
  { href: "/presupuestos", label: "Presupuestos", icon: "📋" },
  { href: "/deudas",       label: "Deudas",       icon: "💳", badge: "deudas" },
  { href: "/caja",         label: "Caja",         icon: "🏦" },
  { href: "/compras",      label: "Compras",      icon: "🛒" },
  { href: "/turnos",       label: "Turnos",       icon: "📅" },
  { href: "/informes",     label: "Informes",     icon: "📊" },
] as const;

interface PwdForm { actual: string; nueva: string; confirmar: string }

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [open, setOpen]             = useState(false);
  const [stockBajo, setStockBajo]   = useState(0);
  const [deudas, setDeudas]         = useState(0);
  const [pwdOpen, setPwdOpen]       = useState(false);
  const [pwdForm, setPwdForm]       = useState<PwdForm>({ actual: "", nueva: "", confirmar: "" });
  const [showActual, setShowActual] = useState(false);
  const [showNueva, setShowNueva]   = useState(false);
  const [pwdError, setPwdError]     = useState("");
  const [pwdOk, setPwdOk]           = useState(false);
  const [pwdSaving, setPwdSaving]   = useState(false);
  const [me, setMe]                 = useState<{ username: string; rol: string } | null>(null);

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.ok ? r.json() : null).then((d) => { if (d) setMe(d); });
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    async function fetchBadges() {
      try {
        const [stockRes, deudasRes] = await Promise.all([
          fetch("/api/informes/stock-bajo?umbral=5"),
          fetch("/api/deudas"),
        ]);
        const stockData  = await stockRes.json();
        const deudasData = await deudasRes.json();
        setStockBajo(Array.isArray(stockData) ? stockData.length : 0);
        setDeudas(Array.isArray(deudasData) ? deudasData.length : 0);
      } catch { /* ignore */ }
    }
    fetchBadges();
    const id = setInterval(fetchBadges, 2 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function openPwdModal() {
    setPwdForm({ actual: "", nueva: "", confirmar: "" });
    setPwdError(""); setPwdOk(false); setShowActual(false); setShowNueva(false);
    setPwdOpen(true);
  }

  async function handleCambiarPwd(e: React.FormEvent) {
    e.preventDefault();
    if (pwdForm.nueva !== pwdForm.confirmar) { setPwdError("Las contraseñas nuevas no coinciden"); return; }
    if (pwdForm.nueva.length < 6) { setPwdError("La contraseña debe tener al menos 6 caracteres"); return; }
    setPwdSaving(true); setPwdError("");
    try {
      const res = await fetch("/api/auth/cambiar-password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passwordActual: pwdForm.actual, passwordNueva: pwdForm.nueva }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setPwdError(err.message ?? "Error al cambiar la contraseña");
        return;
      }
      setPwdOk(true);
      setTimeout(() => setPwdOpen(false), 1500);
    } finally { setPwdSaving(false); }
  }

  const badges: Record<string, number> = { stockBajo, deudas };

  const sidebarContent = (
    <>
      {/* Logo / header */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-gray-700 flex-shrink-0">
        <div className="min-w-0">
          <h1 className="text-lg font-bold tracking-wide">FILT-CAR</h1>
          <p className="text-xs text-gray-400">Lubricentro</p>
          {me && (
            <div className="mt-2.5 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-bold text-white uppercase">
                  {me.username.charAt(0)}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-200 truncate">{me.username}</p>
                <p className="text-[10px] text-blue-400">{me.rol}</p>
              </div>
            </div>
          )}
        </div>
        <button
          onClick={() => setOpen(false)}
          className="lg:hidden text-gray-400 hover:text-white transition-colors p-1 mt-0.5"
          aria-label="Cerrar menú"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3">
        {navItems.map((item) => {
          const active     = pathname === item.href || pathname.startsWith(item.href + "/");
          const badgeKey   = "badge" in item ? item.badge : undefined;
          const badgeCount = badgeKey ? badges[badgeKey] : 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-5 py-3 text-sm transition-colors ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {badgeCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold leading-none px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {badgeCount > 99 ? "99+" : badgeCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Actions + footer */}
      <div className="p-4 border-t border-gray-700 flex-shrink-0 space-y-2">
        <button
          onClick={openPwdModal}
          className="w-full text-left text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2"
        >
          <KeyRound className="w-3.5 h-3.5" /> Cambiar contraseña
        </button>
        <button
          onClick={handleLogout}
          className="w-full text-left text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2"
        >
          <span>⬡</span> Cerrar sesión
        </button>
        <div className="text-[10px] text-gray-600 leading-tight pt-1">
          <p className="font-semibold text-gray-500">© 2026 FILT-CAR · Lubricentro</p>
          <p>Sistema de Gestión · <span className="text-gray-500">{APP_VERSION}</span></p>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white flex flex-col
          transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full"}
          lg:static lg:translate-x-0 lg:w-56 lg:flex-shrink-0 lg:transition-none
        `}
      >
        {sidebarContent}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar — mobile: hamburger + logo; desktop: search only */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 h-14 flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => setOpen(true)}
            className="lg:hidden text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Abrir menú"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="lg:hidden flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <Droplets className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-base">FILT-CAR</span>
          </div>
          <div className="flex-1" />
          <GlobalSearch />
        </header>

        <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Cambiar contraseña modal */}
      {pwdOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setPwdOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-gray-900">Cambiar contraseña</h2>
              </div>
              <button onClick={() => setPwdOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {pwdOk ? (
              <div className="py-8 text-center">
                <p className="text-green-600 font-semibold text-lg">✓ Contraseña actualizada</p>
                <p className="text-sm text-gray-400 mt-1">El modal se cerrará en un momento...</p>
              </div>
            ) : (
              <form onSubmit={handleCambiarPwd} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Contraseña actual</label>
                  <div className="relative">
                    <input
                      type={showActual ? "text" : "password"}
                      required
                      value={pwdForm.actual}
                      onChange={(e) => setPwdForm({ ...pwdForm, actual: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Tu contraseña actual"
                    />
                    <button type="button" onClick={() => setShowActual(!showActual)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showActual ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nueva contraseña</label>
                  <div className="relative">
                    <input
                      type={showNueva ? "text" : "password"}
                      required
                      value={pwdForm.nueva}
                      onChange={(e) => setPwdForm({ ...pwdForm, nueva: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Mínimo 6 caracteres"
                    />
                    <button type="button" onClick={() => setShowNueva(!showNueva)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showNueva ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Confirmar nueva contraseña</label>
                  <input
                    type="password"
                    required
                    value={pwdForm.confirmar}
                    onChange={(e) => setPwdForm({ ...pwdForm, confirmar: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Repetí la nueva contraseña"
                  />
                </div>

                {pwdError && <p className="text-sm text-red-600 font-medium">{pwdError}</p>}

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setPwdOpen(false)}
                    className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" disabled={pwdSaving}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg text-sm transition-colors disabled:opacity-60">
                    {pwdSaving ? "Guardando..." : "Cambiar"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
