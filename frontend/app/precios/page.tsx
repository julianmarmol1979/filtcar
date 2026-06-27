import Link from "next/link";
import { Droplets, Check } from "lucide-react";

const PLANES = [
  {
    nombre: "Básico",
    precio: "$75.000",
    usuarios: "1 usuario",
    destacado: false,
    descripcion: "Para el lubricentro que recién digitaliza su gestión.",
  },
  {
    nombre: "Pro",
    precio: "$100.000",
    usuarios: "Hasta 3 usuarios",
    destacado: true,
    descripcion: "Para equipos con mostrador y empleados administrando el día a día.",
  },
  {
    nombre: "Premium",
    precio: "$140.000",
    usuarios: "Usuarios ilimitados",
    destacado: false,
    descripcion: "Para lubricentros con varios turnos y rotación de personal.",
  },
] as const;

const FEATURES = [
  "Ventas, presupuestos y caja",
  "Control de stock con alertas",
  "Clientes, proveedores y compras",
  "Turnos y agenda semanal",
  "Dashboard con gráficos y estadísticas",
  "Auditoría de actividad del sistema",
  "Soporte y actualizaciones incluidas",
] as const;

export default function PreciosPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gray-900">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
              <Droplets className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-wide">FILT-CAR</span>
          </div>
          <Link
            href="/login"
            className="text-sm font-semibold text-gray-300 hover:text-white transition-colors"
          >
            Ya tengo cuenta →
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gray-900 pb-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
            Planes para tu lubricentro
          </h1>
          <p className="text-gray-400 text-base sm:text-lg">
            Todos los planes incluyen el sistema completo: ventas, stock, caja, clientes,
            turnos e informes. Lo único que cambia es cuántos usuarios pueden trabajar al
            mismo tiempo.
          </p>
        </div>
      </div>

      {/* Plans */}
      <div className="max-w-5xl mx-auto px-6 -mt-10 pb-20">
        <div className="grid sm:grid-cols-3 gap-6">
          {PLANES.map((plan) => (
            <div
              key={plan.nombre}
              className={`rounded-2xl bg-white p-7 shadow-sm border ${
                plan.destacado ? "border-blue-500 ring-2 ring-blue-500/20 sm:-mt-3" : "border-gray-200"
              }`}
            >
              {plan.destacado && (
                <span className="inline-block bg-blue-600 text-white text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full mb-4">
                  Más elegido
                </span>
              )}
              <h2 className="text-lg font-extrabold text-gray-900">{plan.nombre}</h2>
              <p className="text-sm text-gray-500 mt-1 mb-5 min-h-[40px]">{plan.descripcion}</p>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-extrabold text-gray-900">{plan.precio}</span>
                <span className="text-sm text-gray-500">ARS/mes</span>
              </div>
              <p className="text-sm font-semibold text-blue-600 mb-6">{plan.usuarios}</p>

              <ul className="space-y-2.5 mb-7">
                {FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <a
                href="https://wa.me/?text=Hola%2C%20quiero%20info%20sobre%20FILT-CAR"
                target="_blank"
                rel="noopener noreferrer"
                className={`block text-center font-semibold text-sm py-2.5 rounded-xl transition-colors ${
                  plan.destacado
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-800"
                }`}
              >
                Quiero este plan
              </a>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-10">
          Cada instalación de FILT-CAR es exclusiva para tu lubricentro: tu propia base de
          datos, tus usuarios y tu configuración, sin compartir información con otros negocios.
        </p>
      </div>

      <footer className="border-t border-gray-200 py-6">
        <p className="text-center text-xs text-gray-400">
          © {new Date().getFullYear()} FILT-CAR · Desarrollado por Skylia
        </p>
      </footer>
    </div>
  );
}
