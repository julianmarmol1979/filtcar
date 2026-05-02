"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "⊞" },
  { href: "/articulos", label: "Artículos", icon: "📦" },
  { href: "/clientes", label: "Clientes", icon: "👤" },
  { href: "/proveedores", label: "Proveedores", icon: "🏭" },
  { href: "/empleados", label: "Empleados", icon: "👷" },
  { href: "/ventas", label: "Ventas", icon: "💰" },
  { href: "/presupuestos", label: "Presupuestos", icon: "📋" },
  { href: "/caja", label: "Caja", icon: "🏦" },
  { href: "/compras", label: "Compras", icon: "🛒" },
  { href: "/informes", label: "Informes", icon: "📊" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-56 flex-shrink-0 bg-gray-900 text-white flex flex-col h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-gray-700">
        <h1 className="text-lg font-bold tracking-wide">FILT-CAR</h1>
        <p className="text-xs text-gray-400">Lubricentro</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
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
              {item.label}
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
