"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, X, ShoppingCart, ChevronDown, ChevronUp, Download, FileDown } from "lucide-react";
import Pagination from "@/components/Pagination";
import { exportToExcel } from "@/lib/exportExcel";
import { generateVentaPdf } from "@/lib/generatePdf";

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
  Contado: "Contado", Tarjeta: "Tarjeta", Deposito: "Depósito", Deuda: "Deuda",
};

function fmt(n: number) { return "$" + n.toLocaleString("es-AR", { minimumFractionDigits: 2 }); }
function fmtFecha(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
    + " " + d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

export default function VentasPage() {
  const router = useRouter();
  const [ventas, setVentas]           = useState<Venta[]>([]);
  const [search, setSearch]           = useState("");
  const [loading, setLoading]         = useState(true);
  const [expandedId, setExpandedId]   = useState<number | null>(null);
  const [detalle, setDetalle]         = useState<VentaDetalle | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [page, setPage]               = useState(1);
  const [pageSize, setPageSize]       = useState(10);
  const [selected, setSelected]       = useState<Set<number>>(new Set());

  const fetchVentas = useCallback(async (q = "") => {
    setLoading(true); setPage(1); setExpandedId(null); setDetalle(null); setSelected(new Set());
    try {
      const res  = await fetch(`/api/ventas${q ? `?search=${encodeURIComponent(q)}` : ""}`);
      const data = await res.json();
      setVentas(data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchVentas(); }, [fetchVentas]);
  useEffect(() => {
    const t = setTimeout(() => fetchVentas(search), 300);
    return () => clearTimeout(t);
  }, [search, fetchVentas]);

  function handlePageChange(p: number) { setPage(p); setExpandedId(null); setDetalle(null); }

  const paged = ventas.slice((page - 1) * pageSize, page * pageSize);
  const allSelected = ventas.length > 0 && ventas.every((v) => selected.has(v.id));

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(ventas.map((v) => v.id)));
  }
  function toggleOne(id: number) {
    setSelected((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }
  async function handleExport() {
    const toExport = selected.size > 0 ? ventas.filter((v) => selected.has(v.id)) : ventas;
    await exportToExcel(
      toExport.map((v) => ({
        Fecha: fmtFecha(v.fecha),
        Cliente: v.clienteNombre ?? "Mostrador",
        Items: v.itemsCount,
        Total: v.total,
        "Forma de pago": formaPagoLabel[v.formaPago] ?? v.formaPago,
        Estado: v.saldoPendiente > 0 ? `Debe ${fmt(v.saldoPendiente)}` : "Pagado",
      })),
      "ventas"
    );
  }

  async function toggleDetalle(id: number) {
    if (expandedId === id) { setExpandedId(null); setDetalle(null); return; }
    setExpandedId(id); setDetalle(null); setLoadingDetalle(true);
    try {
      const res = await fetch(`/api/ventas/${id}`);
      setDetalle(await res.json());
    } finally { setLoadingDetalle(false); }
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">Ventas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Historial de ventas del lubricentro</p>
        </div>
        <div className="flex items-center gap-2">
          {!loading && ventas.length > 0 && (
            <button onClick={handleExport} className="flex items-center gap-2 border border-green-600 text-green-700 hover:bg-green-50 text-sm font-semibold px-3 sm:px-4 py-2 rounded-lg transition-colors">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">
                {selected.size > 0 ? `Exportar ${selected.size} seleccionados` : "Exportar todos"}
              </span>
            </button>
          )}
          <button onClick={() => router.push("/ventas/nueva")}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nueva venta</span>
          </button>
        </div>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Buscar por cliente..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Cargando...</div>
        ) : ventas.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-2 text-gray-400">
            <ShoppingCart className="w-10 h-10" />
            <p className="text-sm font-medium">{search ? "Sin resultados" : "Todavía no hay ventas registradas"}</p>
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
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Cliente</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Items</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Total</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Pago</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Estado</th>
                  <th className="w-8 px-2 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paged.map((v) => (
                  <>
                    <tr key={v.id} className={`hover:bg-gray-50 transition-colors cursor-pointer ${selected.has(v.id) ? "bg-blue-50" : ""}`}
                      onClick={() => toggleDetalle(v.id)}>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={selected.has(v.id)} onChange={() => toggleOne(v.id)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{fmtFecha(v.fecha)}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {v.clienteNombre ?? <span className="text-gray-400 font-normal">Mostrador</span>}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500 hidden sm:table-cell">{v.itemsCount} art.</td>
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
                    {expandedId === v.id && (
                      <tr key={`${v.id}-d`}>
                        <td colSpan={8} className="bg-blue-50 px-6 py-4 border-b border-blue-100">
                          {loadingDetalle ? <p className="text-sm text-gray-400">Cargando detalle...</p> : detalle ? (
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs text-gray-500 font-medium">
                                  Vendedor: {detalle.empleado.apellido}, {detalle.empleado.nombre}
                                  {detalle.descuento > 0 && <span className="ml-4">Descuento: {fmt(detalle.descuento)}</span>}
                                </p>
                                <button
                                  onClick={(e) => { e.stopPropagation(); generateVentaPdf(detalle); }}
                                  className="flex items-center gap-1.5 border border-gray-300 text-gray-600 hover:bg-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                                >
                                  <FileDown className="w-3.5 h-3.5" />
                                  PDF
                                </button>
                              </div>
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
            </div>
            <Pagination total={ventas.length} page={page} pageSize={pageSize} onPageChange={handlePageChange} onPageSizeChange={setPageSize} />
          </>
        )}
      </div>
    </div>
  );
}
