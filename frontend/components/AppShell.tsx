"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, Droplets, Eye, EyeOff, UserPlus } from "lucide-react";
import { APP_VERSION } from "@/lib/version";
import { GlobalSearch } from "@/components/GlobalSearch";
import { AccountMenu } from "@/components/AccountMenu";

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

interface NuevoUsuarioForm { nombre: string; apellido: string; username: string; password: string; rol: string }

const ROLES_USUARIO = [
  { value: "Admin",          label: "Administrador" },
  { value: "EmpleadoAdmin",  label: "Empleado Admin" },
  { value: "EmpleadoVentas", label: "Vendedor" },
];

const emptyNuevoUsuario: NuevoUsuarioForm = { nombre: "", apellido: "", username: "", password: "", rol: "EmpleadoVentas" };

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [open, setOpen]             = useState(false);
  const [stockBajo, setStockBajo]   = useState(0);
  const [deudas, setDeudas]         = useState(0);
  const [me, setMe]                 = useState<{ username: string; rol: string; fotoUrl: string | null } | null>(null);
  const [userOpen, setUserOpen]     = useState(false);
  const [userForm, setUserForm]     = useState<NuevoUsuarioForm>(emptyNuevoUsuario);
  const [showUserPwd, setShowUserPwd] = useState(false);
  const [userError, setUserError]   = useState("");
  const [userOk, setUserOk]         = useState(false);
  const [userSaving, setUserSaving] = useState(false);

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

  function openUserModal() {
    setUserForm(emptyNuevoUsuario);
    setUserError(""); setUserOk(false); setShowUserPwd(false);
    setUserOpen(true);
  }

  async function handleCrearUsuario(e: React.FormEvent) {
    e.preventDefault();
    if (userForm.password.length < 6) { setUserError("La contraseña debe tener al menos 6 caracteres"); return; }
    setUserSaving(true); setUserError("");
    try {
      const res = await fetch("/api/empleados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userForm),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setUserError(err.message ?? "Error al crear el usuario");
        return;
      }
      setUserOk(true);
      setTimeout(() => setUserOpen(false), 1500);
    } finally { setUserSaving(false); }
  }

  const badges: Record<string, number> = { stockBajo, deudas };

  const sidebarContent = (
    <>
      {/* Logo / header */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-gray-700 flex-shrink-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold tracking-wide">FILT-CAR</h1>
          <p className="text-xs text-gray-400">Lubricentro</p>
          {me && (
            <div className="mt-2.5">
              <AccountMenu
                username={me.username}
                rol={me.rol}
                fotoUrl={me.fotoUrl}
                onFotoUpdated={(url) => setMe((prev) => prev && { ...prev, fotoUrl: url })}
              />
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
        {me?.rol === "Admin" && (
          <button
            onClick={openUserModal}
            className="w-full text-left text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2"
          >
            <UserPlus className="w-3.5 h-3.5" /> Agregar usuario
          </button>
        )}
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

      {/* Agregar usuario modal (solo Admin) */}
      {userOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setUserOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-gray-900">Agregar usuario</h2>
              </div>
              <button onClick={() => setUserOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {userOk ? (
              <div className="py-8 text-center">
                <p className="text-green-600 font-semibold text-lg">✓ Usuario creado</p>
                <p className="text-sm text-gray-400 mt-1">El modal se cerrará en un momento...</p>
              </div>
            ) : (
              <form onSubmit={handleCrearUsuario} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre</label>
                    <input type="text" required value={userForm.nombre}
                      onChange={(e) => setUserForm({ ...userForm, nombre: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Juan" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Apellido</label>
                    <input type="text" required value={userForm.apellido}
                      onChange={(e) => setUserForm({ ...userForm, apellido: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="García" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Usuario</label>
                  <input type="text" required value={userForm.username}
                    onChange={(e) => setUserForm({ ...userForm, username: e.target.value.toLowerCase().replace(/\s/g, "") })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="juangarcia" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Contraseña</label>
                  <div className="relative">
                    <input type={showUserPwd ? "text" : "password"} required value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Mínimo 6 caracteres" minLength={6} />
                    <button type="button" onClick={() => setShowUserPwd(!showUserPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showUserPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Rol</label>
                  <select required value={userForm.rol} onChange={(e) => setUserForm({ ...userForm, rol: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    {ROLES_USUARIO.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>

                {userError && <p className="text-sm text-red-600 font-medium">{userError}</p>}

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setUserOpen(false)}
                    className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" disabled={userSaving}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg text-sm transition-colors disabled:opacity-60">
                    {userSaving ? "Creando..." : "Crear usuario"}
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
