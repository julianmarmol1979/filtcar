"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Search, X, UserCog, Eye, EyeOff, Download } from "lucide-react";
import Pagination from "@/components/Pagination";
import { exportToExcel } from "@/lib/exportExcel";

interface Empleado {
  id: number;
  nombre: string;
  apellido: string;
  username: string;
  rol: string;
  activo: boolean;
}

const ROLES = [
  { value: "Admin",          label: "Administrador" },
  { value: "EmpleadoAdmin",  label: "Empleado Admin" },
  { value: "EmpleadoVentas", label: "Vendedor" },
];

const rolStyle: Record<string, string> = {
  Admin:          "bg-red-100 text-red-700",
  EmpleadoAdmin:  "bg-blue-100 text-blue-700",
  EmpleadoVentas: "bg-green-100 text-green-700",
};

const emptyForm = { nombre: "", apellido: "", username: "", password: "", rol: "EmpleadoVentas" };

export default function EmpleadosPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [search, setSearch]       = useState("");
  const [loading, setLoading]     = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState<Empleado | null>(null);
  const [form, setForm]           = useState(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState(10);
  const [selected, setSelected]   = useState<Set<number>>(new Set());

  const fetchEmpleados = useCallback(async (q = "") => {
    setLoading(true); setPage(1); setSelected(new Set());
    try {
      const res  = await fetch(`/api/empleados${q ? `?search=${encodeURIComponent(q)}` : ""}`);
      const data = await res.json();
      setEmpleados(data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchEmpleados(); }, [fetchEmpleados]);
  useEffect(() => {
    const t = setTimeout(() => fetchEmpleados(search), 300);
    return () => clearTimeout(t);
  }, [search, fetchEmpleados]);

  const paged = empleados.slice((page - 1) * pageSize, page * pageSize);
  const allSelected = empleados.length > 0 && empleados.every((e) => selected.has(e.id));

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(empleados.map((e) => e.id)));
  }
  function toggleOne(id: number) {
    setSelected((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }
  async function handleExport() {
    const toExport = selected.size > 0 ? empleados.filter((e) => selected.has(e.id)) : empleados;
    await exportToExcel(
      toExport.map((e) => ({
        Apellido: e.apellido,
        Nombre: e.nombre,
        Usuario: e.username,
        Rol: ROLES.find((r) => r.value === e.rol)?.label ?? e.rol,
        Estado: e.activo ? "Activo" : "Inactivo",
      })),
      "empleados"
    );
  }

  function openCreate() { setEditing(null); setForm(emptyForm); setShowPassword(false); setError(""); setModalOpen(true); }
  function openEdit(e: Empleado) {
    setEditing(e);
    setForm({ nombre: e.nombre, apellido: e.apellido, username: e.username, password: "", rol: e.rol });
    setShowPassword(false); setError(""); setModalOpen(true);
  }
  function closeModal() { setModalOpen(false); setEditing(null); setError(""); }

  async function handleSave(ev: React.FormEvent) {
    ev.preventDefault(); setSaving(true); setError("");
    try {
      const url    = editing ? `/api/empleados/${editing.id}` : "/api/empleados";
      const method = editing ? "PUT" : "POST";
      const body   = editing ? { ...form, password: form.password || null } : form;
      const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); setError(err.message ?? "Error al guardar"); return; }
      closeModal(); fetchEmpleados(search);
    } finally { setSaving(false); }
  }

  async function handleToggle(e: Empleado) {
    const res = await fetch(`/api/empleados/${e.id}/toggle`, { method: "PATCH" });
    if (!res.ok) { const err = await res.json().catch(() => ({})); alert(err.message ?? "No se puede cambiar el estado"); return; }
    setEmpleados((prev) => prev.map((x) => (x.id === e.id ? { ...x, activo: !x.activo } : x)));
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">Empleados</h1>
          <p className="text-sm text-gray-500 mt-0.5">Usuarios y roles del sistema</p>
        </div>
        <div className="flex items-center gap-2">
          {!loading && empleados.length > 0 && (
            <button onClick={handleExport} className="flex items-center gap-2 border border-green-600 text-green-700 hover:bg-green-50 text-sm font-semibold px-3 sm:px-4 py-2 rounded-lg transition-colors">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">
                {selected.size > 0 ? `Exportar ${selected.size} seleccionados` : "Exportar todos"}
              </span>
            </button>
          )}
          <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo empleado</span>
          </button>
        </div>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Buscar por nombre, usuario..." value={search}
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
        ) : empleados.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-2 text-gray-400">
            <UserCog className="w-10 h-10" />
            <p className="text-sm font-medium">{search ? "Sin resultados para la búsqueda" : "No hay empleados cargados"}</p>
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
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Nombre</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Usuario</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Rol</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Estado</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paged.map((e) => (
                  <tr key={e.id} className={`hover:bg-gray-50 transition-colors ${selected.has(e.id) ? "bg-blue-50" : ""}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.has(e.id)} onChange={() => toggleOne(e.id)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{e.apellido}, {e.nombre}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs hidden sm:table-cell">@{e.username}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${rolStyle[e.rol] ?? "bg-gray-100 text-gray-600"}`}>
                        {ROLES.find((r) => r.value === e.rol)?.label ?? e.rol}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleToggle(e)} disabled={e.username === "admin"}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors ${
                          e.username === "admin" ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : e.activo ? "bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200 cursor-pointer"}`}>
                        {e.activo ? "Activo" : "Inactivo"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => openEdit(e)} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors">
                        <Pencil className="w-3.5 h-3.5" /> Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <Pagination total={empleados.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
          </>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">{editing ? "Editar empleado" : "Nuevo empleado"}</h2>
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
                <label className="block text-sm font-semibold text-gray-700 mb-1">Usuario <span className="text-red-500">*</span></label>
                <input type="text" required value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, "") })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="juangarcia" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Contraseña {!editing && <span className="text-red-500">*</span>}
                  {editing && <span className="text-gray-400 font-normal"> (dejar vacío para no cambiar)</span>}
                </label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} required={!editing} value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={editing ? "••••••••" : "Mínimo 6 caracteres"}
                    minLength={editing && !form.password ? undefined : 6} />
                  <button type="button" onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Rol <span className="text-red-500">*</span></label>
                <select required value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeModal} className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg text-sm transition-colors disabled:opacity-60">
                  {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear empleado"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
