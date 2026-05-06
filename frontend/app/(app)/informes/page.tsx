"use client";

import { useState, useCallback } from "react";
import {
  TrendingUp,
  ShoppingCart,
  Receipt,
  BarChart2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Resumen {
  totalVentas: number;
  cantidadVentas: number;
  ticketPromedio: number;
  totalCompras: number;
  cantidadCompras: number;
  ventasPorFormaPago: { formaPago: string; total: number; cantidad: number }[];
}

interface VentaDia {
  fecha: string;
  total: number;
  cantidad: number;
}

interface TopArticulo {
  articulo: string;
  unidadesVendidas: number;
  totalVendido: number;
}

interface StockBajo {
  id: number;
  marca: string;
  modelo: string;
  stock: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtShort(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return fmt(n);
}

const FORMAS: Record<string, string> = {
  Contado: "Contado",
  Tarjeta: "Tarjeta",
  Deposito: "Depósito",
  Deuda: "Cuenta corriente",
  "0": "Contado",
  "1": "Tarjeta",
  "2": "Depósito",
  "3": "Cuenta corriente",
};

const FORMA_COLORS: Record<string, string> = {
  Contado: "bg-green-500",
  Tarjeta: "bg-blue-500",
  Deposito: "bg-violet-500",
  Deuda: "bg-amber-500",
  "0": "bg-green-500",
  "1": "bg-blue-500",
  "2": "bg-violet-500",
  "3": "bg-amber-500",
};

// ─── Period presets ────────────────────────────────────────────────────────────

type Preset = "hoy" | "7dias" | "mes" | "mes-anterior" | "custom";

function getRange(preset: Preset, customDesde: string, customHasta: string) {
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const iso = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (preset === "hoy") {
    const s = iso(today);
    return { desde: s, hasta: s };
  }
  if (preset === "7dias") {
    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    return { desde: iso(from), hasta: iso(today) };
  }
  if (preset === "mes") {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    return { desde: iso(from), hasta: iso(today) };
  }
  if (preset === "mes-anterior") {
    const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const to = new Date(today.getFullYear(), today.getMonth(), 0);
    return { desde: iso(from), hasta: iso(to) };
  }
  return { desde: customDesde, hasta: customHasta };
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">
          {label}
        </p>
        <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InformesPage() {
  const [preset, setPreset] = useState<Preset>("mes");
  const [customDesde, setCustomDesde] = useState("");
  const [customHasta, setCustomHasta] = useState("");
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [ventasDia, setVentasDia] = useState<VentaDia[]>([]);
  const [topArticulos, setTopArticulos] = useState<TopArticulo[]>([]);
  const [stockBajo, setStockBajo] = useState<StockBajo[]>([]);

  const fetchAll = useCallback(async () => {
    const { desde, hasta } = getRange(preset, customDesde, customHasta);
    if (!desde || !hasta) return;

    setLoading(true);
    try {
      const [r1, r2, r3, r4] = await Promise.all([
        fetch(`/api/informes/resumen?desde=${desde}&hasta=${hasta}`).then((r) =>
          r.json()
        ),
        fetch(
          `/api/informes/ventas-por-dia?desde=${desde}&hasta=${hasta}`
        ).then((r) => r.json()),
        fetch(
          `/api/informes/top-articulos?desde=${desde}&hasta=${hasta}&top=10`
        ).then((r) => r.json()),
        fetch(`/api/informes/stock-bajo?umbral=5`).then((r) => r.json()),
      ]);
      setResumen(r1);
      setVentasDia(r2);
      setTopArticulos(r3);
      setStockBajo(r4);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [preset, customDesde, customHasta]);

  // Auto-load on first render for default preset
  useState(() => {
    fetchAll();
  });

  const presets: { key: Preset; label: string }[] = [
    { key: "hoy", label: "Hoy" },
    { key: "7dias", label: "Últimos 7 días" },
    { key: "mes", label: "Este mes" },
    { key: "mes-anterior", label: "Mes anterior" },
    { key: "custom", label: "Personalizado" },
  ];

  // Bar chart helpers
  const maxVentaDia = Math.max(...ventasDia.map((v) => v.total), 1);
  const maxTopArticulo = Math.max(
    ...topArticulos.map((a) => a.unidadesVendidas),
    1
  );

  const resultado = resumen
    ? resumen.totalVentas - resumen.totalCompras
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Informes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Análisis de ventas, compras y stock
          </p>
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Cargando…" : "Actualizar"}
        </button>
      </div>

      {/* Period selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {presets.map((p) => (
            <button
              key={p.key}
              onClick={() => setPreset(p.key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                preset === p.key
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {p.label}
            </button>
          ))}

          {preset === "custom" && (
            <div className="flex items-center gap-2 ml-2">
              <input
                type="date"
                value={customDesde}
                onChange={(e) => setCustomDesde(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-400 text-sm">→</span>
              <input
                type="date"
                value={customHasta}
                onChange={(e) => setCustomHasta(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={fetchAll}
                disabled={!customDesde || !customHasta || loading}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Ir
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total ventas"
          value={resumen ? fmtShort(resumen.totalVentas) : "—"}
          sub={resumen ? `${resumen.cantidadVentas} operaciones` : undefined}
          icon={TrendingUp}
          color="bg-blue-500"
        />
        <StatCard
          label="Ticket promedio"
          value={resumen ? fmtShort(resumen.ticketPromedio) : "—"}
          icon={Receipt}
          color="bg-violet-500"
        />
        <StatCard
          label="Total compras"
          value={resumen ? fmtShort(resumen.totalCompras) : "—"}
          sub={resumen ? `${resumen.cantidadCompras} órdenes` : undefined}
          icon={ShoppingCart}
          color="bg-amber-500"
        />
        <StatCard
          label="Resultado"
          value={resultado !== null ? fmtShort(Math.abs(resultado)) : "—"}
          sub={
            resultado !== null
              ? resultado >= 0
                ? "Ganancia"
                : "Pérdida"
              : undefined
          }
          icon={BarChart2}
          color={
            resultado !== null && resultado >= 0
              ? "bg-green-500"
              : "bg-red-500"
          }
        />
      </div>

      {loaded && (
        <>
          {/* Row: Forma de pago + Top artículos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Ventas por forma de pago */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Ventas por forma de pago
              </h2>
              {resumen && resumen.ventasPorFormaPago.length > 0 ? (
                <div className="space-y-3">
                  {resumen.ventasPorFormaPago.map((fp) => {
                    const pct =
                      resumen.totalVentas > 0
                        ? Math.round((fp.total / resumen.totalVentas) * 100)
                        : 0;
                    const color =
                      FORMA_COLORS[fp.formaPago] ?? "bg-gray-400";
                    const label = FORMAS[fp.formaPago] ?? fp.formaPago;
                    return (
                      <div key={fp.formaPago}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700 font-medium">
                            {label}
                          </span>
                          <span className="text-gray-500">
                            {fmt(fp.total)}{" "}
                            <span className="text-gray-400">({pct}%)</span>
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${color} transition-all duration-500`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {fp.cantidad} venta{fp.cantidad !== 1 ? "s" : ""}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400">
                  Sin datos en el período.
                </p>
              )}
            </div>

            {/* Top artículos */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Top artículos vendidos
              </h2>
              {topArticulos.length > 0 ? (
                <div className="space-y-2.5">
                  {topArticulos.map((a, i) => {
                    const pct = Math.round(
                      (a.unidadesVendidas / maxTopArticulo) * 100
                    );
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700 font-medium truncate max-w-[55%]">
                            <span className="text-gray-400 mr-1.5">
                              #{i + 1}
                            </span>
                            {a.articulo}
                          </span>
                          <span className="text-gray-500 shrink-0">
                            {a.unidadesVendidas} u ·{" "}
                            <span className="text-gray-400">
                              {fmtShort(a.totalVendido)}
                            </span>
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-500 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400">
                  Sin ventas en el período.
                </p>
              )}
            </div>
          </div>

          {/* Ventas por día */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
              Ventas por día
            </h2>
            {ventasDia.length > 0 ? (
              <div className="overflow-x-auto">
                <div
                  className="flex items-end gap-1.5 min-w-0"
                  style={{ minHeight: 160 }}
                >
                  {ventasDia.map((v) => {
                    const pct = Math.round((v.total / maxVentaDia) * 100);
                    const barH = Math.max(4, Math.round((pct / 100) * 140));
                    const dayLabel = v.fecha.slice(8); // DD
                    const monthLabel = v.fecha.slice(5, 7); // MM
                    return (
                      <div
                        key={v.fecha}
                        className="flex-1 min-w-[28px] flex flex-col items-center gap-1 group"
                      >
                        {/* Tooltip */}
                        <div className="hidden group-hover:flex flex-col items-center z-10">
                          <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                            <span className="font-semibold">{fmt(v.total)}</span>
                            <br />
                            <span className="text-gray-300">
                              {v.cantidad} venta{v.cantidad !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900" />
                        </div>
                        {/* Bar */}
                        <div
                          className="w-full bg-blue-500 rounded-t hover:bg-blue-400 transition-colors cursor-default"
                          style={{ height: barH }}
                        />
                        {/* Label */}
                        <span className="text-[10px] text-gray-400 leading-none">
                          {dayLabel}/{monthLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Sin ventas en el período.</p>
            )}
          </div>

          {/* Stock bajo */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Stock bajo (≤ 5 unidades)
              </h2>
              {stockBajo.length > 0 && (
                <span className="ml-auto bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {stockBajo.length} artículo
                  {stockBajo.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            {stockBajo.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {stockBajo.map((a) => (
                  <div
                    key={a.id}
                    className={`rounded-lg border p-3 ${
                      a.stock === 0
                        ? "border-red-200 bg-red-50"
                        : "border-amber-200 bg-amber-50"
                    }`}
                  >
                    <p className="text-xs text-gray-500 font-medium truncate">
                      {a.marca}
                    </p>
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {a.modelo}
                    </p>
                    <p
                      className={`text-lg font-bold mt-1 ${
                        a.stock === 0 ? "text-red-600" : "text-amber-600"
                      }`}
                    >
                      {a.stock === 0 ? "SIN STOCK" : `${a.stock} u.`}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                ✓ Todos los artículos tienen stock suficiente.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
