"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, Droplets } from "lucide-react";

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
  { href: "/informes",     label: "Informes",     icon: "📊" },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [open, setOpen]           = useState(false);
  const [stockBajo, setStockBajo] = useState(0);
  const [deudas, setDeudas]       = useState(0);

  // Close drawer whenever route changes
  useEffect(() => { setOpen(false); }, [pathname]);

  // Lock body scroll when drawer is open on mobile
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Poll badges every 2 minutes
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

  const badges: Record<string, number> = { stockBajo, deudas };

  const sidebarContent = (
    <>
      {/* Logo / header */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-gray-700 flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold tracking-wide">FILT-CAR</h1>
          <p className="text-xs text-gray-400">Lubricentro</p>
        </div>
        {/* Close button — only visible on mobile */}
        <button
          onClick={() => setOpen(false)}
          className="lg:hidden text-gray-400 hover:text-white transition-colors p-1"
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

      {/* Logout */}
      <div className="p-4 border-t border-gray-700 flex-shrink-0">
        <button
          onClick={handleLogout}
          className="w-full text-left text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2"
        >
          <span>⬡</span> Cerrar sesión
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">

      {/* ── Mobile overlay backdrop ──────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar — drawer on mobile, static on desktop ────────── */}
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

      {/* ── Main area ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 h-14 flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => setOpen(true)}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Abrir menú"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <Droplets className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-base">FILT-CAR</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">
          {children}
        </main>

      </div>
    </div>
  );
}
