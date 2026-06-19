"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, ShoppingBag, ChevronDown, ChevronUp, Download, CalendarDays, X } from "lucide-react";
import Pagination from "@/components/Pagination";
import { exportToExcel } from "@/lib/exportExcel";

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

function fmt(n: number) { return "$" + n.toLocaleString("es-AR", { minimumFractionDigits: 2 }); }
function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function ComprasPage() {
  const router = useRouter();
  const [compras, setCompras]               = useState<Compra[]>([]);
  const [desde, setDesde]                   = useState("");
  const [hasta, setHasta]                   = useState("");
  const [loading, setLoading]               = useState(true);
  const [expandedId, setExpandedId]         = useState<number | null>(null);
  const [detalle, setDetalle]               = useState<CompraDetalle | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [page, setPage]                     = useState(1);
  const [pageSize, setPageSize]             = useState(10);
  const [selected, setSelected]             = useState<Set<number>>(new Set());

  const fetchCompras = useCallback(async () => {
    setLoading(true); setSelected(new Set());
    try {
      const res  = await fetch("/api/compras");
      const data = await res.json();
      setCompras(data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCompras(); }, [fetchCompras]);
  useEffect(() => { setPage(1); setExpandedId(null); setDetalle(null); }, [desde, hasta]);

  const hasDateFilter = !!desde || !!hasta;
  const filtered = hasDateFilter
    ? compras.filter((c) => {
        const d = new Date(c.fecha);
        if (desde && d < new Date(desde + "T00:00:00")) return false;
        if (hasta && d > new Date(hasta + "T23:59:59")) return false;
        return true;
      })
    : compras;

  const totalFiltrado = filtered.reduce((s, c) => s + c.total, 0);

  function handlePageChange(p: number) { setPage(p); setExpandedId(null); setDetalle(null); }

  const paged       = filtered.slice((page - 1) * pageSize, page * pageSize);
  const allSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id));

  function clearFilters() { setDesde(""); setHasta(""); }
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(filtered.map((c) => c.id)));
  }
  function toggleOne(id: number) {
    setSelected((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }
  async function handleExport() {
    const toExport = selected.size > 0 ? filtered.filter((c) => selected.has(c.id)) : filtered;
    await exportToExcel(
      toExport.map((c) => ({
        Fecha: fmtFecha(c.fecha),
        Proveedor: c.proveedor,
        Items: c.itemsCount,
        Total: c.total,
        Pago: c.pagoInmediato ? "Inmediato" : "Pendiente",
        Estado: c.saldoPendiente > 0 ? `Debe ${fmt(c.saldoPendiente)}` : "Pagado",
      })),
      "compras"
    );
  }

  async function toggleDetalle(id: number) {
    if (expandedId === id) { setExpandedId(null); setDetalle(null); return; }
    setExpandedId(id); setDetalle(null); setLoadingDetalle(true);
    try {
      const res = await fetch(`/api/compras/${id}`);
      setDetalle(await res.json());
    } finally { setLoadingDetalle(false); }
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">Compras</h1>
          <p className="text-sm text-gray-500 mt-0.5">Compras a proveedores y reposición de stock</p>
        </div>
        <div className="flex items-center gap-2">
          {!loading && filtered.length > 0 && (
            <button onClick={handleExport} className="flex items-center gap-2 border border-green-600 text-green-700 hover:bg-green-50 text-sm font-semibold px-3 sm:px-4 py-2 rounded-lg transition-colors">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">
                {selected.size > 0 ? `Exportar ${selected.size} seleccionados` : "Exportar todos"}
              </span>
            </button>
          )}
          <button onClick={() => router.push("/compras/nueva")}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nueva compra</span>
          </button>
        </div>
      </div>

      {/* Date filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-gray-400 hidden sm:block" />
          <div className="flex items-center gap-1">
            <label className="text-xs text-gray-500 font-medium whitespace-nowrap">Desde</label>
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-36" />
          </div>
          <div className="flex items-center gap-1">
            <label className="text-xs text-gray-500 font-medium whitespace-nowrap">Hasta</label>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)}
              min={desde || undefined}
              className="text-sm border border-gray-300 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-36" />
          </div>
        </div>
        {hasDateFilter && (
          <button onClick={clearFilters}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 px-3 py-2 rounded-lg transition-colors">
            <X className="w-3.5 h-3.5" /> Limpiar
          </button>
        )}
      </div>

      {/* Period summary */}
      {!loading && hasDateFilter && filtered.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-blue-700 font-medium">
            {filtered.length} {filtered.length === 1 ? "compra" : "compras"} en el período
          </p>
          <p className="text-lg font-extrabold text-blue-800">{fmt(totalFiltrado)}</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-2 text-gray-400">
            <ShoppingBag className="w-10 h-10" />
            <p className="text-sm font-medium">{hasDateFilter ? "Sin compras en ese período" : "No hay compras registradas"}</p>
            {hasDateFilter && <button onClick={clearFilters} className="text-xs text-blue-600 hover:underline mt-1">Limpiar filtros</button>}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Fecha</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Proveedor</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Items</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Total</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Estado</th>
                  <th className="w-8 px-2 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paged.map((c) => (
                  <>
                    <tr key={c.id} className={`hover:bg-gray-50 transition-colors cursor-pointer ${selected.has(c.id) ? "bg-blue-50" : ""}`}
                      onClick={() => toggleDetalle(c.id)}>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleOne(c.id)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                      </td>
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
                        <td colSpan={7} className="bg-blue-50 px-6 py-4 border-b border-blue-100">
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
            </div>
            <Pagination total={filtered.length} page={page} pageSize={pageSize} onPageChange={handlePageChange} onPageSizeChange={setPageSize} />
          </>
        )}
      </div>
    </div>
  );
}
