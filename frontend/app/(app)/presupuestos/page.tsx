"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, FileText, ChevronDown, ChevronUp, Download, ShoppingCart } from "lucide-react";
import Pagination from "@/components/Pagination";
import { exportToExcel } from "@/lib/exportExcel";

interface Presupuesto {
  id: number;
  fecha: string;
  vencimiento: string;
  clienteNombre: string | null;
  empleado: string;
  itemsCount: number;
  total: number;
  observacion: string | null;
  vencido: boolean;
}

interface PresupuestoDetalle {
  id: number;
  fecha: string;
  vencimiento: string;
  clienteId: number | null;
  cliente: { nombre: string; apellido: string } | null;
  empleado: { nombre: string; apellido: string };
  items: { id: number; articuloId: number; articulo: string; stock: number; cantidad: number; precioUnitario: number; subtotal: number }[];
  total: number;
  observacion: string | null;
  vencido: boolean;
}

function fmt(n: number) { return "$" + n.toLocaleString("es-AR", { minimumFractionDigits: 2 }); }
function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function PresupuestosPage() {
  const router = useRouter();
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [loading, setLoading]           = useState(true);
  const [expandedId, setExpandedId]     = useState<number | null>(null);
  const [detalle, setDetalle]           = useState<PresupuestoDetalle | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [page, setPage]                 = useState(1);
  const [pageSize, setPageSize]         = useState(10);
  const [selected, setSelected]         = useState<Set<number>>(new Set());

  const fetchPresupuestos = useCallback(async () => {
    setLoading(true); setSelected(new Set());
    try {
      const res = await fetch("/api/presupuestos");
      setPresupuestos(await res.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPresupuestos(); }, [fetchPresupuestos]);

  function handlePageChange(p: number) { setPage(p); setExpandedId(null); setDetalle(null); }

  const paged = presupuestos.slice((page - 1) * pageSize, page * pageSize);
  const allSelected = presupuestos.length > 0 && presupuestos.every((p) => selected.has(p.id));

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(presupuestos.map((p) => p.id)));
  }
  function toggleOne(id: number) {
    setSelected((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }
  async function handleExport() {
    const toExport = selected.size > 0 ? presupuestos.filter((p) => selected.has(p.id)) : presupuestos;
    await exportToExcel(
      toExport.map((p) => ({
        Fecha: fmtFecha(p.fecha),
        Vencimiento: fmtFecha(p.vencimiento),
        Cliente: p.clienteNombre ?? "Sin cliente",
        Items: p.itemsCount,
        Total: p.total,
        Estado: p.vencido ? "Vencido" : "Vigente",
        Observación: p.observacion || "",
      })),
      "presupuestos"
    );
  }

  async function toggleDetalle(id: number) {
    if (expandedId === id) { setExpandedId(null); setDetalle(null); return; }
    setExpandedId(id); setDetalle(null); setLoadingDetalle(true);
    try {
      const res = await fetch(`/api/presupuestos/${id}`);
      setDetalle(await res.json());
    } finally { setLoadingDetalle(false); }
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">Presupuestos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Cotizaciones para clientes</p>
        </div>
        <div className="flex items-center gap-2">
          {!loading && presupuestos.length > 0 && (
            <button onClick={handleExport} className="flex items-center gap-2 border border-green-600 text-green-700 hover:bg-green-50 text-sm font-semibold px-3 sm:px-4 py-2 rounded-lg transition-colors">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">
                {selected.size > 0 ? `Exportar ${selected.size} seleccionados` : "Exportar todos"}
              </span>
            </button>
          )}
          <button onClick={() => router.push("/presupuestos/nuevo")}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo presupuesto</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Cargando...</div>
        ) : presupuestos.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-2 text-gray-400">
            <FileText className="w-10 h-10" />
            <p className="text-sm font-medium">No hay presupuestos registrados</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Fecha</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Cliente</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Vence</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Total</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Estado</th>
                  <th className="w-8 px-2 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paged.map((p) => (
                  <>
                    <tr key={p.id} className={`hover:bg-gray-50 transition-colors cursor-pointer ${selected.has(p.id) ? "bg-blue-50" : ""}`}
                      onClick={() => toggleDetalle(p.id)}>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{fmtFecha(p.fecha)}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {p.clienteNombre ?? <span className="text-gray-400 font-normal">Sin cliente</span>}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500 text-xs hidden sm:table-cell">{fmtFecha(p.vencimiento)}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">{fmt(p.total)}</td>
                      <td className="px-4 py-3 text-center">
                        {p.vencido ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Vencido</span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Vigente</span>
                        )}
                      </td>
                      <td className="px-2 py-3 text-gray-400">
                        {expandedId === p.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </td>
                    </tr>
                    {expandedId === p.id && (
                      <tr key={`${p.id}-d`}>
                        <td colSpan={7} className="bg-blue-50 px-6 py-4 border-b border-blue-100">
                          {loadingDetalle ? <p className="text-sm text-gray-400">Cargando...</p> : detalle ? (
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs text-gray-500 font-medium">
                                  Vendedor: {detalle.empleado.apellido}, {detalle.empleado.nombre}
                                  {detalle.observacion && <span className="ml-4">Obs: {detalle.observacion}</span>}
                                </p>
                                <button
                                  onClick={(e) => { e.stopPropagation(); router.push(`/ventas/nueva?from=${detalle.id}`); }}
                                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                                >
                                  <ShoppingCart className="w-3.5 h-3.5" />
                                  Convertir a venta
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
            <Pagination total={presupuestos.length} page={page} pageSize={pageSize} onPageChange={handlePageChange} onPageSizeChange={setPageSize} />
          </>
        )}
      </div>
    </div>
  );
}
