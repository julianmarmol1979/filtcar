"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Search, X, PackageX } from "lucide-react";
import Pagination from "@/components/Pagination";

interface Articulo {
  id: number;
  marca: string;
  modelo: string;
  descripcion: string;
  stock: number;
  precio: number;
  activo: boolean;
}

const emptyForm = { marca: "", modelo: "", descripcion: "", stock: 0, precio: 0 };

export default function ArticulosPage() {
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [search, setSearch]       = useState("");
  const [loading, setLoading]     = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState<Articulo | null>(null);
  const [form, setForm]           = useState(emptyForm);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState(10);

  const fetchArticulos = useCallback(async (q = "") => {
    setLoading(true);
    setPage(1);
    try {
      const res  = await fetch(`/api/articulos${q ? `?search=${encodeURIComponent(q)}` : ""}`);
      const data = await res.json();
      setArticulos(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchArticulos(); }, [fetchArticulos]);
  useEffect(() => {
    const t = setTimeout(() => fetchArticulos(search), 300);
    return () => clearTimeout(t);
  }, [search, fetchArticulos]);

  const paged = articulos.slice((page - 1) * pageSize, page * pageSize);

  function openCreate() { setEditing(null); setForm(emptyForm); setError(""); setModalOpen(true); }
  function openEdit(a: Articulo) {
    setEditing(a);
    setForm({ marca: a.marca, modelo: a.modelo, descripcion: a.descripcion, stock: a.stock, precio: a.precio });
    setError("");
    setModalOpen(true);
  }
  function closeModal() { setModalOpen(false); setEditing(null); setError(""); }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      const url    = editing ? `/api/articulos/${editing.id}` : "/api/articulos";
      const method = editing ? "PUT" : "POST";
      const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); setError(err.message ?? "Error al guardar"); return; }
      closeModal();
      fetchArticulos(search);
    } finally { setSaving(false); }
  }

  async function handleToggle(a: Articulo) {
    await fetch(`/api/articulos/${a.id}/toggle`, { method: "PATCH" });
    setArticulos((prev) => prev.map((x) => (x.id === a.id ? { ...x, activo: !x.activo } : x)));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Artículos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión de productos y lubricantes</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Nuevo artículo
        </button>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Buscar por marca, modelo..." value={search}
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
        ) : articulos.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-2 text-gray-400">
            <PackageX className="w-10 h-10" />
            <p className="text-sm font-medium">{search ? "Sin resultados para la búsqueda" : "Todavía no hay artículos"}</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Marca</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Modelo</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Descripción</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Precio</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Stock</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Estado</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paged.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-gray-900">{a.marca}</td>
                    <td className="px-4 py-3 text-gray-700">{a.modelo}</td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell max-w-xs truncate">{a.descripcion || "—"}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      ${a.precio.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold ${a.stock === 0 ? "text-red-600" : a.stock <= 5 ? "text-yellow-600" : "text-gray-900"}`}>
                        {a.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleToggle(a)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${a.activo ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                        {a.activo ? "Activo" : "Inactivo"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => openEdit(a)} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors">
                        <Pencil className="w-3.5 h-3.5" /> Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination total={articulos.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
          </>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">{editing ? "Editar artículo" : "Nuevo artículo"}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Marca <span className="text-red-500">*</span></label>
                  <input type="text" required value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: Castrol" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Modelo <span className="text-red-500">*</span></label>
                  <input type="text" required value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: GTX 20W-50" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Descripción</label>
                <input type="text" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: Aceite mineral 1L" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Precio <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                    <input type="number" required min={0} step="0.01" value={form.precio} onChange={(e) => setForm({ ...form, precio: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Stock <span className="text-red-500">*</span></label>
                  <input type="number" required min={0} value={form.stock} onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeModal} className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg text-sm transition-colors disabled:opacity-60">
                  {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear artículo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
