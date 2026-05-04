"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, X, ShoppingCart, ChevronDown, ChevronUp } from "lucide-react";

interface Venta {
  id: number;
  fecha: string;
  clienteNombre: string | null;
  empleadoNombre: string;
  itemsCount: number;
  total: number;
  descuento: number;
  formaPago: string;
  montoPagado: number;
  saldoPendiente: number;
}

interface VentaDetalle {
  id: number;
  fecha: string;
  cliente: { nombre: string; apellido: string } | null;
  empleado: { nombre: string; apellido: string };
  items: { id: number; articulo: string; cantidad: number; precioUnitario: number; subtotal: number }[];
  total: number;
  descuento: number;
  formaPago: string;
  montoPagado: number;
  saldoPendiente: number;
}

const formaPagoStyle: Record<string, string> = {
  Contado:  "bg-green-100 text-green-700",
  Tarjeta:  "bg-blue-100 text-blue-700",
  Deposito: "bg-purple-100 text-purple-700",
  Deuda:    "bg-red-100 text-red-700",
};

const formaPagoLabel: Record<string, string> = {
  Contado:  "Contado",
  Tarjeta:  "Tarjeta",
  Deposito: "Depósito",
  Deuda:    "Deuda",
};

function fmt(n: number) {
  return "$" + n.toLocaleString("es-AR", { minimumFractionDigits: 2 });
}

function fmtFecha(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
    + " " + d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

export default function VentasPage() {
  const router = useRouter();
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detalle, setDetalle] = useState<VentaDetalle | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  const fetchVentas = useCallback(async (q = "") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ventas${q ? `?search=${encodeURIComponent(q)}` : ""}`);
      const data = await res.json();
      setVentas(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchVentas(); }, [fetchVentas]);

  useEffect(() => {
    const timer = setTimeout(() => fetchVentas(search), 300);
    return () => clearTimeout(timer);
  }, [search, fetchVentas]);

  async function toggleDetalle(id: number) {
    if (expandedId === id) {
      setExpandedId(null);
      setDetalle(null);
      return;
    }
    setExpandedId(id);
    setDetalle(null);
    setLoadingDetalle(true);
    try {
      const res = await fetch(`/api/ventas/${id}`);
      const data = await res.json();
      setDetalle(data);
    } finally {
      setLoadingDetalle(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Ventas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Historial de ventas del lubricentro</p>
        </div>
        <button
          onClick={() => router.push("/ventas/nueva")}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva venta
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Cargando...</div>
        ) : ventas.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-2 text-gray-400">
            <ShoppingCart className="w-10 h-10" />
            <p className="text-sm font-medium">
              {search ? "Sin resultados" : "Todavía no hay ventas registradas"}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Fecha</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Cliente</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Items</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Total</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Pago</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Estado</th>
                <th className="w-8 px-2 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ventas.map((v) => (
                <>
                  <tr
                    key={v.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => toggleDetalle(v.id)}
                  >
                    <td className="px-4 py-3 text-gray-600 text-xs">{fmtFecha(v.fecha)}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {v.clienteNombre ?? <span className="text-gray-400 font-normal">Mostrador</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500 hidden sm:table-cell">
                      {v.itemsCount} art.
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">{fmt(v.total)}</td>
                    <td className="px-4 py-3 text-center hidden md:table-cell">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${formaPagoStyle[v.formaPago] ?? "bg-gray-100 text-gray-600"}`}>
                        {formaPagoLabel[v.formaPago] ?? v.formaPago}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {v.saldoPendiente > 0 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                          Debe {fmt(v.saldoPendiente)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                          Pagado
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-3 text-gray-400">
                      {expandedId === v.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </td>
                  </tr>

                  {/* Expanded detail row */}
                  {expandedId === v.id && (
                    <tr key={`${v.id}-detail`}>
                      <td colSpan={7} className="bg-blue-50 px-6 py-4 border-b border-blue-100">
                        {loadingDetalle ? (
                          <p className="text-sm text-gray-400">Cargando detalle...</p>
                        ) : detalle ? (
                          <div>
                            <p className="text-xs text-gray-500 mb-2 font-medium">
                              Vendedor: {detalle.empleado.apellido}, {detalle.empleado.nombre}
                              {detalle.descuento > 0 && <span className="ml-4">Descuento: {fmt(detalle.descuento)}</span>}
                            </p>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-gray-500">
                                  <th className="text-left pb-1 font-semibold">Artículo</th>
                                  <th className="text-right pb-1 font-semibold">Cant.</th>
                                  <th className="text-right pb-1 font-semibold">P. Unit.</th>
                                  <th className="text-right pb-1 font-semibold">Subtotal</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-blue-100">
                                {detalle.items.map((item) => (
                                  <tr key={item.id}>
                                    <td className="py-1 text-gray-800 font-medium">{item.articulo}</td>
                                    <td className="py-1 text-right text-gray-600">{item.cantidad}</td>
                                    <td className="py-1 text-right text-gray-600">{fmt(item.precioUnitario)}</td>
                                    <td className="py-1 text-right font-semibold text-gray-900">{fmt(item.subtotal)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-2 text-right">
        {ventas.length} venta{ventas.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
