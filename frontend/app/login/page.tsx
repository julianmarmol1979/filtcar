"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Droplets } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) { setError("Usuario o contraseña incorrectos"); return; }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel ─────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 bg-gray-900 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-700/5 rounded-full blur-3xl" />
        </div>

        {/* Logo */}
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Droplets className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-xl tracking-wide">FILT-CAR</span>
          </div>
        </div>

        {/* Center content */}
        <div className="relative space-y-6">
          <div className="space-y-3">
            <h2 className="text-4xl font-extrabold text-white leading-tight">
              Sistema de gestión<br />
              <span className="text-blue-400">para tu lubricentro</span>
            </h2>
            <p className="text-gray-400 text-lg leading-relaxed max-w-sm">
              Controlá ventas, stock, caja y clientes desde un solo lugar.
            </p>
          </div>

          {/* Feature bullets */}
          <div className="space-y-3">
            {[
              "Ventas y presupuestos al instante",
              "Control de stock con alertas automáticas",
              "Informes y estadísticas en tiempo real",
            ].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-600/30 border border-blue-500/50 flex items-center justify-center shrink-0">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                </div>
                <span className="text-gray-300 text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative">
          <p className="text-gray-600 text-xs">
            © {new Date().getFullYear()} FILT-CAR · Lubricentro Sistema de Gestión
          </p>
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Droplets className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">FILT-CAR</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-extrabold text-gray-900">Bienvenido</h1>
            <p className="text-gray-500 text-sm mt-1">Ingresá con tu usuario y contraseña</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Usuario <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition"
                placeholder="Ej: admin"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Contraseña <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3.5 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-sm text-red-600 font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-3 rounded-xl text-sm transition-colors disabled:opacity-60 mt-2"
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
