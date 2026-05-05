"use client";

import { useEffect, useState } from "react";
import {
  Package,
  Users,
  TrendingUp,
  Wallet,
  AlertCircle,
  FileText,
} from "lucide-react";

interface DashboardData {
  articulosActivos: number;
  clientesActivos: number;
  ventasHoyCantidad: number;
  ventasHoyTotal: number;
  deudasCantidad: number;
  deudasTotal: number;
  saldoCaja: number;
  presupuestosVigentes: number;
}

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

interface CardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  bg: string;
  text: string;
  iconBg: string;
}

function StatCard({ label, value, sub, icon: Icon, bg, text, iconBg }: CardProps) {
  return (
    <div className={`rounded-xl p-5 ${bg} flex items-start gap-4`}>
      <div className={`p-2.5 rounded-lg ${iconBg}`}>
        <Icon className={`w-5 h-5 ${text}`} />
      </div>
      <div className="min-w-0">
        <p className={`text-xs font-semibold uppercase tracking-wide ${text} opacity-70`}>
          {label}
        </p>
        <p className={`text-2xl font-bold mt-1 ${text}`}>{value}</p>
        {sub && (
          <p className={`text-xs mt-0.5 ${text} opacity-60`}>{sub}</p>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  const cards: CardProps[] = data
    ? [
        {
          label: "Artículos",
          value: String(data.articulosActivos),
          sub: "artículos activos",
          icon: Package,
          bg: "bg-blue-50",
          text: "text-blue-700",
          iconBg: "bg-blue-100",
        },
        {
          label: "Clientes",
          value: String(data.clientesActivos),
          sub: "clientes activos",
          icon: Users,
          bg: "bg-green-50",
          text: "text-green-700",
          iconBg: "bg-green-100",
        },
        {
          label: "Ventas hoy",
          value: data.ventasHoyCantidad > 0 ? fmtShort(data.ventasHoyTotal) : "Sin ventas",
          sub:
            data.ventasHoyCantidad > 0
              ? `${data.ventasHoyCantidad} operación${data.ventasHoyCantidad !== 1 ? "es" : ""}`
              : "todavía no hay ventas hoy",
          icon: TrendingUp,
          bg: "bg-yellow-50",
          text: "text-yellow-700",
          iconBg: "bg-yellow-100",
        },
        {
          label: "Saldo caja",
          value: fmtShort(data.saldoCaja),
          sub: "acumulado histórico",
          icon: Wallet,
          bg: "bg-purple-50",
          text: "text-purple-700",
          iconBg: "bg-purple-100",
        },
        {
          label: "Deudas pendientes",
          value: data.deudasCantidad > 0 ? fmtShort(data.deudasTotal) : "Sin deudas",
          sub:
            data.deudasCantidad > 0
              ? `${data.deudasCantidad} venta${data.deudasCantidad !== 1 ? "s" : ""} en cuenta corriente`
              : "todo al día",
          icon: AlertCircle,
          bg: "bg-red-50",
          text: "text-red-700",
          iconBg: "bg-red-100",
        },
        {
          label: "Presupuestos",
          value: String(data.presupuestosVigentes),
          sub: "vigentes",
          icon: FileText,
          bg: "bg-gray-50",
          text: "text-gray-700",
          iconBg: "bg-gray-200",
        },
      ]
    : [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Dashboard</h1>
      <p className="text-gray-500 text-sm mb-6">
        Bienvenido al sistema de gestión Lubricentro FILT-CAR.
      </p>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl p-5 bg-gray-100 animate-pulse h-24"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {cards.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </div>
      )}
    </div>
  );
}
