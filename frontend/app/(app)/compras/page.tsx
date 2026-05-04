"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, ShoppingBag, ChevronDown, ChevronUp } from "lucide-react";

interface Compra {
  id: number;
  fecha: string;
  proveedor: string;
  empleado: string;
  itemsCount: number;
  total: number;
  pagoInmediato: boolean;
  montoPagado: number;
  saldoPendiente: number;
  cancelada: boolean;
}

interface CompraDetalle {
  id: number;
  fecha: string;
  proveedor: { nombre: string };
  empleado: { nombre: string; apellido: string };
  items: { id: number; articulo: string; cantidad: number; precioUnitario: number; subtotal: number }[];
  total: number;
  pagoInmediato: boolean;
  saldoPendiente: number;
}

function fmt(n: number) {
  return "$" + n.toLocaleString("es-AR", { minimumFractionDigits: 2 });
}
function fmtFecha(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function ComprasPage() {
  const router = useRouter();
  const [compras, setCompras] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detalle, setDetalle] = useState<CompraDetalle | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  const fetchCompras = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/compras");
      const data = await res.json();
      setCompras(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCompras(); }, [fetchCompras]);

  async function toggleDetalle(id: number) {
    if (expandedId === id) { setExpandedId(null); setDetalle(null); return; }
    setExpandedId(id);
    setDetalle(null);
    setLoadingDetalle(true);
    try {
      const res = await fetch(`/api/compras/${id}`);
      setDetalle(await res.json());
    } finally {
      setLoadingDetalle(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Compras</h1>
          <p className="text-sm text-gray-500 mt-0.5">Compras a proveedores y reposición de stock</p>
        </div>
        <button onClick={() => router.push("/compras/nueva")}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Nueva compra
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Cargando...</div>
        ) : compras.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-2 text-gray-400">
            <ShoppingBag className="w-10 h-10" />
            <p className="text-sm font-medium">No hay compras registradas</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Fecha</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Proveedor</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Items</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Total</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Estado</th>
                <th className="w-8 px-2 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {compras.map((c) => (
                <>
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => toggleDetalle(c.id)}>
                    <td className="px-4 py-3 text-gray-500 text-xs">{fmtFecha(c.fecha)}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{c.proveedor}</td>
                    <td className="px-4 py-3 text-center text-gray-500 hidden sm:table-cell">{c.itemsCount} art.</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">{fmt(c.total)}</td>
                    <td className="px-4 py-3 text-center">
                      {c.saldoPendiente > 0 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                          Debe {fmt(c.saldoPendiente)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                          Pagado
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-3 text-gray-400">
                      {expandedId === c.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </td>
                  </tr>
                  {expandedId === c.id && (
                    <tr key={`${c.id}-d`}>
                      <td colSpan={6} className="bg-blue-50 px-6 py-4 border-b border-blue-100">
                        {loadingDetalle ? <p className="text-sm text-gray-400">Cargando...</p> : detalle ? (
                          <div>
                            <p className="text-xs text-gray-500 mb-2 font-medium">
                              Empleado: {detalle.empleado.apellido}, {detalle.empleado.nombre}
                              <span className="ml-4">{detalle.pagoInmediato ? "Pago inmediato" : `Saldo pendiente: ${fmt(detalle.saldoPendiente)}`}</span>
                            </p>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-gray-500">
                                  <th className="text-left pb-1 font-semibold">Artículo</th>
                                  <th className="text-right pb-1 font-semibold">Cant.</th>
                                  <th className="text-right pb-1 font-semibold">P. Compra</th>
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
      <p className="text-xs text-gray-400 mt-2 text-right">{compras.length} compra{compras.length !== 1 ? "s" : ""}</p>
    </div>
  );
}
