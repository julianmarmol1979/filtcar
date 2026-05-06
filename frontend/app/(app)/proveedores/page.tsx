"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Search, X, Truck, Download } from "lucide-react";
import Pagination from "@/components/Pagination";
import { exportToExcel } from "@/lib/exportExcel";

interface Proveedor {
  id: number;
  nombre: string;
  contacto?: string;
  telefono?: string;
  email?: string;
  activo: boolean;
}

const emptyForm = { nombre: "", contacto: "", telefono: "", email: "" };

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [search, setSearch]           = useState("");
  const [loading, setLoading]         = useState(true);
  const [modalOpen, setModalOpen]     = useState(false);
  const [editing, setEditing]         = useState<Proveedor | null>(null);
  const [form, setForm]               = useState(emptyForm);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");
  const [page, setPage]               = useState(1);
  const [pageSize, setPageSize]       = useState(10);
  const [selected, setSelected]       = useState<Set<number>>(new Set());

  const fetchProveedores = useCallback(async (q = "") => {
    setLoading(true); setPage(1); setSelected(new Set());
    try {
      const res  = await fetch(`/api/proveedores${q ? `?search=${encodeURIComponent(q)}` : ""}`);
      const data = await res.json();
      setProveedores(data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchProveedores(); }, [fetchProveedores]);
  useEffect(() => {
    const t = setTimeout(() => fetchProveedores(search), 300);
    return () => clearTimeout(t);
  }, [search, fetchProveedores]);

  const paged = proveedores.slice((page - 1) * pageSize, page * pageSize);
  const allSelected = proveedores.length > 0 && proveedores.every((p) => selected.has(p.id));

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(proveedores.map((p) => p.id)));
  }
  function toggleOne(id: number) {
    setSelected((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }
  async function handleExport() {
    const toExport = selected.size > 0 ? proveedores.filter((p) => selected.has(p.id)) : proveedores;
    await exportToExcel(
      toExport.map((p) => ({
        Nombre: p.nombre,
        Contacto: p.contacto || "",
        Teléfono: p.telefono || "",
        Email: p.email || "",
        Estado: p.activo ? "Activo" : "Inactivo",
      })),
      "proveedores"
    );
  }

  function openCreate() { setEditing(null); setForm(emptyForm); setError(""); setModalOpen(true); }
  function openEdit(p: Proveedor) {
    setEditing(p);
    setForm({ nombre: p.nombre, contacto: p.contacto ?? "", telefono: p.telefono ?? "", email: p.email ?? "" });
    setError(""); setModalOpen(true);
  }
  function closeModal() { setModalOpen(false); setEditing(null); setError(""); }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    try {
      const url    = editing ? `/api/proveedores/${editing.id}` : "/api/proveedores";
      const method = editing ? "PUT" : "POST";
      const res    = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, contacto: form.contacto || null, telefono: form.telefono || null, email: form.email || null }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); setError(err.message ?? "Error al guardar"); return; }
      closeModal(); fetchProveedores(search);
    } finally { setSaving(false); }
  }

  async function handleToggle(p: Proveedor) {
    await fetch(`/api/proveedores/${p.id}/toggle`, { method: "PATCH" });
    setProveedores((prev) => prev.map((x) => (x.id === p.id ? { ...x, activo: !x.activo } : x)));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Proveedores</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión de proveedores y distribuidores</p>
        </div>
        <div className="flex items-center gap-2">
          {!loading && proveedores.length > 0 && (
            <button onClick={handleExport} className="flex items-center gap-2 border border-green-600 text-green-700 hover:bg-green-50 text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              <Download className="w-4 h-4" />
              {selected.size > 0 ? `Exportar ${selected.size} seleccionados` : "Exportar todos"}
            </button>
          )}
          <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Nuevo proveedor
          </button>
        </div>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Buscar por nombre, contacto..." value={search}
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
        ) : proveedores.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-2 text-gray-400">
            <Truck className="w-10 h-10" />
            <p className="text-sm font-medium">{search ? "Sin resultados para la búsqueda" : "Todavía no hay proveedores"}</p>
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
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Empresa</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Contacto</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Teléfono</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Email</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Estado</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paged.map((p) => (
                  <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${selected.has(p.id) ? "bg-blue-50" : ""}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{p.nombre}</td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{p.contacto || <span className="text-gray-400">—</span>}</td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                      {p.telefono ? <a href={`tel:${p.telefono}`} className="hover:text-blue-600 transition-colors">{p.telefono}</a> : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">
                      {p.email ? <a href={`mailto:${p.email}`} className="hover:text-blue-600 transition-colors">{p.email}</a> : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleToggle(p)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${p.activo ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                        {p.activo ? "Activo" : "Inactivo"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => openEdit(p)} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors">
                        <Pencil className="w-3.5 h-3.5" /> Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination total={proveedores.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
          </>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">{editing ? "Editar proveedor" : "Nuevo proveedor"}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre / Empresa <span className="text-red-500">*</span></label>
                <input type="text" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: Lubricantes del Sur S.A." />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Persona de contacto</label>
                <input type="text" value={form.contacto} onChange={(e) => setForm({ ...form, contacto: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: Carlos Pérez" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Teléfono</label>
                  <input type="tel" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="2614 123456" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="ventas@empresa.com" />
                </div>
              </div>
              {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeModal} className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg text-sm transition-colors disabled:opacity-60">
                  {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear proveedor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
