"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Search, X, Users, Download, History, ShoppingCart, FileText } from "lucide-react";
import Pagination from "@/components/Pagination";
import { exportToExcel } from "@/lib/exportExcel";

interface Cliente {
  id: number;
  nombre: string;
  apellido: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  activo: boolean;
}

interface VentaHistorial {
  id: number;
  fecha: string;
  total: number;
  descuento: number;
  formaPago: string;
  saldoPendiente: number;
  itemsCount: number;
}

interface PresupuestoHistorial {
  id: number;
  fecha: string;
  vencimiento: string;
  total: number;
  itemsCount: number;
  vencido: boolean;
}

type HistorialTab = "ventas" | "presupuestos";

const emptyForm = { nombre: "", apellido: "", telefono: "", email: "", direccion: "" };

function fmt(n: number) {
  return "$" + n.toLocaleString("es-AR", { minimumFractionDigits: 2 });
}
function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

const FORMA_PAGO_COLOR: Record<string, string> = {
  Contado:  "bg-green-100 text-green-700",
  Tarjeta:  "bg-blue-100 text-blue-700",
  Deposito: "bg-purple-100 text-purple-700",
  Deuda:    "bg-red-100 text-red-700",
};

export default function ClientesPage() {
  const [clientes, setClientes]   = useState<Cliente[]>([]);
  const [search, setSearch]       = useState("");
  const [loading, setLoading]     = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState<Cliente | null>(null);
  const [form, setForm]           = useState(emptyForm);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState(10);
  const [selected, setSelected]   = useState<Set<number>>(new Set());

  // Historial
  const [historialCliente, setHistorialCliente]   = useState<Cliente | null>(null);
  const [historialTab, setHistorialTab]           = useState<HistorialTab>("ventas");
  const [historialVentas, setHistorialVentas]     = useState<VentaHistorial[]>([]);
  const [historialPresu, setHistorialPresu]       = useState<PresupuestoHistorial[]>([]);
  const [loadingHistorial, setLoadingHistorial]   = useState(false);

  const fetchClientes = useCallback(async (q = "") => {
    setLoading(true);
    setPage(1);
    setSelected(new Set());
    try {
      const res  = await fetch(`/api/clientes${q ? `?search=${encodeURIComponent(q)}` : ""}`);
      const data = await res.json();
      setClientes(data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchClientes(); }, [fetchClientes]);
  useEffect(() => {
    const t = setTimeout(() => fetchClientes(search), 300);
    return () => clearTimeout(t);
  }, [search, fetchClientes]);

  const paged = clientes.slice((page - 1) * pageSize, page * pageSize);
  const allSelected = clientes.length > 0 && clientes.every((c) => selected.has(c.id));

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(clientes.map((c) => c.id)));
  }
  function toggleOne(id: number) {
    setSelected((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }
  async function handleExport() {
    const toExport = selected.size > 0 ? clientes.filter((c) => selected.has(c.id)) : clientes;
    exportToExcel(
      toExport.map((c) => ({
        Apellido: c.apellido,
        Nombre: c.nombre,
        Teléfono: c.telefono || "",
        Email: c.email || "",
        Dirección: c.direccion || "",
        Estado: c.activo ? "Activo" : "Inactivo",
      })),
      "clientes"
    );
  }

  function openCreate() { setEditing(null); setForm(emptyForm); setError(""); setModalOpen(true); }
  function openEdit(c: Cliente) {
    setEditing(c);
    setForm({ nombre: c.nombre, apellido: c.apellido, telefono: c.telefono ?? "", email: c.email ?? "", direccion: c.direccion ?? "" });
    setError(""); setModalOpen(true);
  }
  function closeModal() { setModalOpen(false); setEditing(null); setError(""); }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    try {
      const url    = editing ? `/api/clientes/${editing.id}` : "/api/clientes";
      const method = editing ? "PUT" : "POST";
      const res    = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, telefono: form.telefono || null, email: form.email || null, direccion: form.direccion || null }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); setError(err.message ?? "Error al guardar"); return; }
      closeModal(); fetchClientes(search);
    } finally { setSaving(false); }
  }

  async function handleToggle(c: Cliente) {
    await fetch(`/api/clientes/${c.id}/toggle`, { method: "PATCH" });
    setClientes((prev) => prev.map((x) => (x.id === c.id ? { ...x, activo: !x.activo } : x)));
  }

  async function openHistorial(c: Cliente) {
    setHistorialCliente(c);
    setHistorialTab("ventas");
    setHistorialVentas([]);
    setHistorialPresu([]);
    setLoadingHistorial(true);
    try {
      const res  = await fetch(`/api/clientes/${c.id}/historial`);
      const data = await res.json();
      setHistorialVentas(data.ventas ?? []);
      setHistorialPresu(data.presupuestos ?? []);
    } finally { setLoadingHistorial(false); }
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión de clientes del lubricentro</p>
        </div>
        <div className="flex items-center gap-2">
          {!loading && clientes.length > 0 && (
            <button onClick={handleExport} className="flex items-center gap-2 border border-green-600 text-green-700 hover:bg-green-50 text-sm font-semibold px-3 sm:px-4 py-2 rounded-lg transition-colors">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">
                {selected.size > 0 ? `Exportar ${selected.size} seleccionados` : "Exportar todos"}
              </span>
            </button>
          )}
          <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo cliente</span>
          </button>
        </div>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Buscar por nombre, teléfono..." value={search}
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
        ) : clientes.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-2 text-gray-400">
            <Users className="w-10 h-10" />
            <p className="text-sm font-medium">{search ? "Sin resultados para la búsqueda" : "Todavía no hay clientes"}</p>
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
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Nombre</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Teléfono</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Email</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Dirección</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Estado</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paged.map((c) => (
                  <tr key={c.id} className={`hover:bg-gray-50 transition-colors ${selected.has(c.id) ? "bg-blue-50" : ""}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleOne(c.id)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{c.apellido}, {c.nombre}</td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">
                      {c.telefono ? <a href={`tel:${c.telefono}`} className="hover:text-blue-600 transition-colors">{c.telefono}</a> : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                      {c.email ? <a href={`mailto:${c.email}`} className="hover:text-blue-600 transition-colors">{c.email}</a> : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell max-w-xs truncate">{c.direccion || <span className="text-gray-400">—</span>}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleToggle(c)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${c.activo ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                        {c.activo ? "Activo" : "Inactivo"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <button onClick={() => openHistorial(c)} className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 font-medium transition-colors">
                          <History className="w-3.5 h-3.5" /> Historial
                        </button>
                        <button onClick={() => openEdit(c)} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors">
                          <Pencil className="w-3.5 h-3.5" /> Editar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination total={clientes.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
          </>
        )}
      </div>

      {/* ── Edit / Create modal ──────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">{editing ? "Editar cliente" : "Nuevo cliente"}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre <span className="text-red-500">*</span></label>
                  <input type="text" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Juan" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Apellido <span className="text-red-500">*</span></label>
                  <input type="text" required value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="García" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Teléfono</label>
                <input type="tel" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: 2614 123456" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="juan@email.com" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Dirección</label>
                <input type="text" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: San Martín 123, Córdoba" />
              </div>
              {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeModal} className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg text-sm transition-colors disabled:opacity-60">
                  {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Historial modal ──────────────────────────────────────────────────── */}
      {historialCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setHistorialCliente(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 flex flex-col max-h-[80vh]">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {historialCliente.apellido}, {historialCliente.nombre}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Historial de operaciones</p>
              </div>
              <button onClick={() => setHistorialCliente(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 px-6">
              <button
                onClick={() => setHistorialTab("ventas")}
                className={`flex items-center gap-1.5 py-3 px-1 mr-6 text-sm font-semibold border-b-2 transition-colors ${
                  historialTab === "ventas"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                Ventas {!loadingHistorial && `(${historialVentas.length})`}
              </button>
              <button
                onClick={() => setHistorialTab("presupuestos")}
                className={`flex items-center gap-1.5 py-3 px-1 text-sm font-semibold border-b-2 transition-colors ${
                  historialTab === "presupuestos"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <FileText className="w-4 h-4" />
                Presupuestos {!loadingHistorial && `(${historialPresu.length})`}
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 px-6 py-4">
              {loadingHistorial ? (
                <p className="text-center text-gray-400 text-sm py-8">Cargando...</p>
              ) : historialTab === "ventas" ? (
                historialVentas.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 text-gray-400 py-10">
                    <ShoppingCart className="w-8 h-8" />
                    <p className="text-sm">Sin ventas registradas</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500 border-b border-gray-100">
                        <th className="text-left pb-2 font-semibold">Fecha</th>
                        <th className="text-center pb-2 font-semibold">Items</th>
                        <th className="text-center pb-2 font-semibold">Forma pago</th>
                        <th className="text-right pb-2 font-semibold">Total</th>
                        <th className="text-right pb-2 font-semibold">Saldo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {historialVentas.map((v) => (
                        <tr key={v.id} className="hover:bg-gray-50">
                          <td className="py-2.5 text-gray-500">{fmtFecha(v.fecha)}</td>
                          <td className="py-2.5 text-center text-gray-600">{v.itemsCount}</td>
                          <td className="py-2.5 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${FORMA_PAGO_COLOR[v.formaPago] ?? "bg-gray-100 text-gray-600"}`}>
                              {v.formaPago}
                            </span>
                          </td>
                          <td className="py-2.5 text-right font-semibold text-gray-900">{fmt(v.total)}</td>
                          <td className="py-2.5 text-right">
                            {v.saldoPendiente > 0
                              ? <span className="font-bold text-red-600">{fmt(v.saldoPendiente)}</span>
                              : <span className="text-green-600 font-medium">Cobrado</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              ) : (
                historialPresu.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 text-gray-400 py-10">
                    <FileText className="w-8 h-8" />
                    <p className="text-sm">Sin presupuestos registrados</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500 border-b border-gray-100">
                        <th className="text-left pb-2 font-semibold">Fecha</th>
                        <th className="text-left pb-2 font-semibold">Vence</th>
                        <th className="text-center pb-2 font-semibold">Items</th>
                        <th className="text-right pb-2 font-semibold">Total</th>
                        <th className="text-center pb-2 font-semibold">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {historialPresu.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="py-2.5 text-gray-500">{fmtFecha(p.fecha)}</td>
                          <td className="py-2.5 text-gray-500">{fmtFecha(p.vencimiento)}</td>
                          <td className="py-2.5 text-center text-gray-600">{p.itemsCount}</td>
                          <td className="py-2.5 text-right font-semibold text-gray-900">{fmt(p.total)}</td>
                          <td className="py-2.5 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${p.vencido ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                              {p.vencido ? "Vencido" : "Vigente"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
