"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/dashboard",    label: "Dashboard",   icon: "⊞" },
  { href: "/articulos",    label: "Artículos",   icon: "📦", badge: "stockBajo" },
  { href: "/clientes",     label: "Clientes",    icon: "👤" },
  { href: "/proveedores",  label: "Proveedores", icon: "🏭" },
  { href: "/empleados",    label: "Empleados",   icon: "👷" },
  { href: "/ventas",       label: "Ventas",      icon: "💰" },
  { href: "/presupuestos", label: "Presupuestos",icon: "📋" },
  { href: "/deudas",       label: "Deudas",      icon: "💳", badge: "deudas" },
  { href: "/caja",         label: "Caja",        icon: "🏦" },
  { href: "/compras",      label: "Compras",     icon: "🛒" },
  { href: "/informes",     label: "Informes",    icon: "📊" },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [stockBajo, setStockBajo] = useState(0);
  const [deudas, setDeudas]       = useState(0);

  // Poll stock-bajo count every 2 minutes
  useEffect(() => {
    async function fetchStockBajo() {
      try {
        const res  = await fetch("/api/informes/stock-bajo?umbral=5");
        const data = await res.json();
        setStockBajo(Array.isArray(data) ? data.length : 0);
      } catch {
        // silently ignore — badge just won't show
      }
    }
    fetchStockBajo();
    const id = setInterval(fetchStockBajo, 2 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Poll deudas pendientes count every 2 minutes
  useEffect(() => {
    async function fetchDeudas() {
      try {
        const res  = await fetch("/api/deudas");
        const data = await res.json();
        setDeudas(Array.isArray(data) ? data.length : 0);
      } catch {
        // silently ignore
      }
    }
    fetchDeudas();
    const id = setInterval(fetchDeudas, 2 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const badges: Record<string, number> = { stockBajo, deudas };

  return (
    <aside className="w-56 flex-shrink-0 bg-gray-900 text-white flex flex-col h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-gray-700">
        <h1 className="text-lg font-bold tracking-wide">FILT-CAR</h1>
        <p className="text-xs text-gray-400">Lubricentro</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        {navItems.map((item) => {
          const active      = pathname === item.href || pathname.startsWith(item.href + "/");
          const badgeKey    = "badge" in item ? item.badge : undefined;
          const badgeCount  = badgeKey ? badges[badgeKey] : 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <span className="text-base">{item.icon}</span>
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

      <div className="p-4 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="w-full text-left text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2"
        >
          <span>⬡</span> Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
