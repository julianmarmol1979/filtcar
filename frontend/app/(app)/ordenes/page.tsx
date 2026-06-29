"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, X, Wrench, Search, Trash2, CheckSquare, Package } from "lucide-react";

interface Cliente {
  id: number;
  nombre: string;
  apellido: string;
}

interface AutoOption {
  id: number;
  patente: string;
  marca?: string | null;
  modelo?: string | null;
}

interface Empleado {
  id: number;
  nombre: string;
  apellido: string;
}

interface ArticuloOption {
  id: number;
  marca: string;
  modelo: string;
  precio: number;
  stock: number;
  activo: boolean;
}

interface ItemOrden {
  id: number;
  articuloId: number;
  articulo: string;
  stockDisponible: number;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

interface Orden {
  id: number;
  clienteId: number;
  cliente: { nombre: string; apellido: string; telefono: string | null };
  autoId: number;
  auto: { patente: string; marca: string | null; modelo: string | null };
  empleadoId: number | null;
  empleado: { nombre: string; apellido: string } | null;
  fecha: string;
  estado: string;
  motivo: string;
  kilometrajeIngreso: number | null;
  observaciones: string | null;
}

interface ChecklistItem {
  id: number;
  descripcion: string;
  respuesta: boolean | null;
}

interface OrdenDetail extends Orden {
  checklist: ChecklistItem[];
  items: ItemOrden[];
  total: number;
}

function fmt(n: number) {
  return "$" + n.toLocaleString("es-AR", { minimumFractionDigits: 2 });
}

const ESTADOS = ["Pendiente", "EnProceso", "Completada", "Cancelada"] as const;

const ESTADO_LABEL: Record<string, string> = {
  Pendiente: "Pendiente",
  EnProceso: "En proceso",
  Completada: "Completada",
  Cancelada: "Cancelada",
};

const ESTADO_COLOR: Record<string, string> = {
  Pendiente: "bg-amber-100 text-amber-700",
  EnProceso: "bg-blue-100 text-blue-700",
  Completada: "bg-green-100 text-green-700",
  Cancelada: "bg-gray-200 text-gray-600",
};

const emptyForm = {
  clienteId: "" as number | "",
  autoId: "" as number | "",
  empleadoId: "" as number | "",
  motivo: "",
  kilometrajeIngreso: "",
  observaciones: "",
};

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function OrdenesPage() {
  const [ordenes, setOrdenes]     = useState<Orden[]>([]);
  const [clientes, setClientes]   = useState<Cliente[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState(() =>
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("search") ?? "" : ""
  );
  const [filtroEstado, setFiltroEstado] = useState("");

  // Create modal
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm]           = useState(emptyForm);
  const [autosCliente, setAutosCliente] = useState<AutoOption[]>([]);
  const [nuevoAuto, setNuevoAuto] = useState(false);
  const [nuevoAutoForm, setNuevoAutoForm] = useState({ patente: "", marca: "", modelo: "" });
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  // Detail modal (checklist + artículos)
  const [detalle, setDetalle]     = useState<OrdenDetail | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [savingChecklist, setSavingChecklist] = useState(false);
  const [detalleTab, setDetalleTab] = useState<"articulos" | "checklist">("articulos");
  const [articulos, setArticulos] = useState<ArticuloOption[]>([]);
  const [itemsForm, setItemsForm] = useState<{ articuloId: number; label: string; precio: number; stock: number; cantidad: number }[]>([]);
  const [articuloToAdd, setArticuloToAdd] = useState<number | "">("");
  const [savingItems, setSavingItems] = useState(false);

  const fetchOrdenes = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (search) qs.set("search", search);
      if (filtroEstado) qs.set("estado", filtroEstado);
      const res  = await fetch(`/api/ordenes?${qs}`);
      const data = await res.json();
      setOrdenes(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  }, [search, filtroEstado]);

  useEffect(() => { fetchOrdenes(); }, [fetchOrdenes]);
  useEffect(() => { const t = setTimeout(fetchOrdenes, 300); return () => clearTimeout(t); }, [search, fetchOrdenes]);

  useEffect(() => {
    fetch("/api/clientes").then((r) => r.json()).then((d) => setClientes(Array.isArray(d) ? d : []));
    fetch("/api/empleados").then((r) => r.json()).then((d) => setEmpleados(Array.isArray(d) ? d : []));
    fetch("/api/articulos").then((r) => r.json()).then((d) => setArticulos(Array.isArray(d) ? d.filter((a: ArticuloOption) => a.activo) : []));
  }, []);

  useEffect(() => {
    if (!form.clienteId) { setAutosCliente([]); return; }
    fetch(`/api/autos?clienteId=${form.clienteId}`)
      .then((r) => r.json())
      .then((d) => {
        const activos = Array.isArray(d) ? d.filter((a: { activo: boolean }) => a.activo) : [];
        setAutosCliente(activos);
        // Si el cliente no tiene vehículos cargados, pasamos directo al alta — no hay nada para elegir.
        setNuevoAuto(activos.length === 0);
      });
  }, [form.clienteId]);

  function openCreate() {
    setForm(emptyForm);
    setNuevoAuto(false);
    setNuevoAutoForm({ patente: "", marca: "", modelo: "" });
    setError("");
    setModalOpen(true);
  }
  function closeModal() { setModalOpen(false); setError(""); }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.clienteId) { setError("Seleccioná un cliente"); return; }
    if (!nuevoAuto && !form.autoId) { setError("Seleccioná un vehículo o agregá uno nuevo"); return; }
    if (nuevoAuto && !nuevoAutoForm.patente.trim()) { setError("Ingresá la patente del vehículo nuevo"); return; }
    if (!form.motivo.trim()) { setError("Describí el motivo del ingreso"); return; }

    setSaving(true);
    try {
      let autoId = form.autoId;
      if (nuevoAuto) {
        const res = await fetch("/api/autos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clienteId: form.clienteId,
            patente: nuevoAutoForm.patente,
            marca: nuevoAutoForm.marca || null,
            modelo: nuevoAutoForm.modelo || null,
          }),
        });
        if (!res.ok) { const err = await res.json().catch(() => ({})); setError(err.message ?? "Error al crear el vehículo"); return; }
        const created = await res.json();
        autoId = created.id;
      }

      const res = await fetch("/api/ordenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteId: form.clienteId,
          autoId,
          empleadoId: form.empleadoId || null,
          motivo: form.motivo,
          kilometrajeIngreso: form.kilometrajeIngreso ? parseInt(form.kilometrajeIngreso) : null,
          observaciones: form.observaciones || null,
        }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); setError(err.message ?? "Error al crear la orden"); return; }
      closeModal();
      fetchOrdenes();
    } finally { setSaving(false); }
  }

  async function handleEstadoChange(o: Orden, estado: string) {
    const res = await fetch(`/api/ordenes/${o.id}/estado`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.message ?? "No se pudo cambiar el estado de la orden");
      return;
    }
    setOrdenes((prev) => prev.map((x) => (x.id === o.id ? { ...x, estado } : x)));
    if (detalle?.id === o.id) await openDetalle(o);
  }

  async function handleDelete(o: Orden) {
    if (!confirm(`¿Eliminar la orden de "${o.auto.patente}"?`)) return;
    await fetch(`/api/ordenes/${o.id}`, { method: "DELETE" });
    fetchOrdenes();
  }

  async function openDetalle(o: Orden) {
    setLoadingDetalle(true);
    setDetalle(null);
    setDetalleTab("articulos");
    try {
      const res  = await fetch(`/api/ordenes/${o.id}`);
      const data: OrdenDetail = await res.json();
      setDetalle(data);
      setItemsForm(data.items.map((i) => ({
        articuloId: i.articuloId,
        label: i.articulo,
        precio: i.precioUnitario,
        stock: i.stockDisponible,
        cantidad: i.cantidad,
      })));
    } finally { setLoadingDetalle(false); }
  }

  const ordenCerrada = detalle?.estado === "Completada" || detalle?.estado === "Cancelada";

  const articulosDisponibles = articulos.filter(
    (a) => !itemsForm.find((i) => i.articuloId === a.id)
  );

  function handleAddArticulo(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = parseInt(e.target.value);
    if (!id) return;
    const art = articulos.find((a) => a.id === id);
    if (!art) return;
    setItemsForm((prev) => [
      ...prev,
      { articuloId: art.id, label: `${art.marca} ${art.modelo}`, precio: art.precio, stock: art.stock, cantidad: 1 },
    ]);
    setArticuloToAdd("");
  }

  function updateItemCantidad(articuloId: number, val: string) {
    const n = parseInt(val);
    setItemsForm((prev) => prev.map((i) => (i.articuloId === articuloId ? { ...i, cantidad: isNaN(n) || n < 1 ? 1 : n } : i)));
  }

  function removeItemForm(articuloId: number) {
    setItemsForm((prev) => prev.filter((i) => i.articuloId !== articuloId));
  }

  async function handleSaveItems() {
    if (!detalle) return;
    setSavingItems(true);
    try {
      const res = await fetch(`/api/ordenes/${detalle.id}/items`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: itemsForm.map((i) => ({ articuloId: i.articuloId, cantidad: i.cantidad })) }),
      });
      if (res.ok) {
        await openDetalle(detalle);
        fetchOrdenes();
      }
    } finally { setSavingItems(false); }
  }

  function setRespuesta(itemId: number, respuesta: boolean) {
    setDetalle((prev) => prev && {
      ...prev,
      checklist: prev.checklist.map((ci) => (ci.id === itemId ? { ...ci, respuesta: ci.respuesta === respuesta ? null : respuesta } : ci)),
    });
  }

  async function handleSaveChecklist() {
    if (!detalle) return;
    setSavingChecklist(true);
    try {
      await fetch(`/api/ordenes/${detalle.id}/checklist`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: detalle.checklist.map((ci) => ({ id: ci.id, respuesta: ci.respuesta })) }),
      });
      setDetalle(null);
    } finally { setSavingChecklist(false); }
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">Órdenes de trabajo</h1>
          <p className="text-sm text-gray-500 mt-0.5">Ingresos de vehículos al taller, con checklist de revisión</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nueva orden</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Buscar por patente, cliente, motivo..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => <option key={e} value={e}>{ESTADO_LABEL[e]}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Cargando...</div>
        ) : ordenes.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-2 text-gray-400">
            <Wrench className="w-10 h-10" />
            <p className="text-sm font-medium">Todavía no hay órdenes de trabajo</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Fecha</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Cliente</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Vehículo</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Motivo</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Responsable</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Estado</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ordenes.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500">{fmtFecha(o.fecha)}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{o.cliente.apellido}, {o.cliente.nombre}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {o.auto.patente}
                      {(o.auto.marca || o.auto.modelo) && (
                        <span className="text-gray-400"> · {[o.auto.marca, o.auto.modelo].filter(Boolean).join(" ")}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell max-w-xs truncate">{o.motivo}</td>
                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                      {o.empleado ? `${o.empleado.apellido}, ${o.empleado.nombre}` : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <select
                        value={o.estado}
                        onChange={(e) => handleEstadoChange(o, e.target.value)}
                        className={`text-xs font-semibold rounded-full px-2.5 py-1 border-0 cursor-pointer ${ESTADO_COLOR[o.estado] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {ESTADOS.map((e) => <option key={e} value={e}>{ESTADO_LABEL[e]}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <button onClick={() => openDetalle(o)} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors">
                          <Package className="w-3.5 h-3.5" /> Detalle
                        </button>
                        <button onClick={() => handleDelete(o)} className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create modal ─────────────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Nueva orden de trabajo</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Cliente <span className="text-red-500">*</span></label>
                <select required value={form.clienteId}
                  onChange={(e) => setForm({ ...form, clienteId: e.target.value ? parseInt(e.target.value) : "", autoId: "" })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Seleccioná un cliente...</option>
                  {clientes.map((c) => <option key={c.id} value={c.id}>{c.apellido}, {c.nombre}</option>)}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-semibold text-gray-700">Vehículo <span className="text-red-500">*</span></label>
                  {form.clienteId && autosCliente.length > 0 && (
                    <button type="button" onClick={() => setNuevoAuto(!nuevoAuto)} className="text-xs font-semibold text-blue-600 hover:text-blue-800">
                      {nuevoAuto ? "Elegir uno existente" : "+ Vehículo nuevo"}
                    </button>
                  )}
                </div>
                {!nuevoAuto ? (
                  <select required={!nuevoAuto} value={form.autoId} disabled={!form.clienteId}
                    onChange={(e) => setForm({ ...form, autoId: e.target.value ? parseInt(e.target.value) : "" })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-50">
                    <option value="">{form.clienteId ? "Seleccioná un vehículo..." : "Primero elegí un cliente"}</option>
                    {autosCliente.map((a) => (
                      <option key={a.id} value={a.id}>{a.patente}{(a.marca || a.modelo) ? ` · ${[a.marca, a.modelo].filter(Boolean).join(" ")}` : ""}</option>
                    ))}
                  </select>
                ) : (
                  <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                    {form.clienteId && autosCliente.length === 0 && (
                      <p className="text-xs text-gray-500 mb-3">Este cliente todavía no tiene vehículos registrados. Cargá los datos para agregarlo:</p>
                    )}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Patente <span className="text-red-500">*</span></label>
                        <input type="text" placeholder="AB123CD" value={nuevoAutoForm.patente}
                          onChange={(e) => setNuevoAutoForm({ ...nuevoAutoForm, patente: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Marca</label>
                        <input type="text" placeholder="Ford" value={nuevoAutoForm.marca}
                          onChange={(e) => setNuevoAutoForm({ ...nuevoAutoForm, marca: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Modelo</label>
                        <input type="text" placeholder="Fiesta" value={nuevoAutoForm.modelo}
                          onChange={(e) => setNuevoAutoForm({ ...nuevoAutoForm, modelo: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Motivo de ingreso <span className="text-red-500">*</span></label>
                <textarea required rows={2} value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                  placeholder="Ej: Ruido en suspensión delantera, revisión general antes de viaje, cambio de pastillas de freno..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Kilometraje</label>
                  <input type="number" min={0} value={form.kilometrajeIngreso}
                    onChange={(e) => setForm({ ...form, kilometrajeIngreso: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Responsable</label>
                  <select value={form.empleadoId} onChange={(e) => setForm({ ...form, empleadoId: e.target.value ? parseInt(e.target.value) : "" })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">Sin asignar</option>
                    {empleados.map((e) => <option key={e.id} value={e.id}>{e.apellido}, {e.nombre}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Observaciones</label>
                <textarea rows={2} value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeModal} className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg text-sm transition-colors disabled:opacity-60">
                  {saving ? "Guardando..." : "Crear orden"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Detail modal: artículos + checklist ──────────────────────────────── */}
      {(detalle || loadingDetalle) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDetalle(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {detalle ? `${detalle.auto.patente} — ${detalle.cliente.apellido}, ${detalle.cliente.nombre}` : "Cargando..."}
                </h2>
                {detalle && <p className="text-xs text-gray-400 mt-0.5">{detalle.motivo}</p>}
              </div>
              <button onClick={() => setDetalle(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            {detalle && (
              <div className="flex border-b border-gray-100 px-6">
                <button
                  onClick={() => setDetalleTab("articulos")}
                  className={`flex items-center gap-1.5 py-3 px-1 mr-6 text-sm font-semibold border-b-2 transition-colors ${
                    detalleTab === "articulos" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Package className="w-4 h-4" /> Artículos ({detalle.items.length})
                </button>
                <button
                  onClick={() => setDetalleTab("checklist")}
                  className={`flex items-center gap-1.5 py-3 px-1 text-sm font-semibold border-b-2 transition-colors ${
                    detalleTab === "checklist" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <CheckSquare className="w-4 h-4" /> Checklist
                </button>
              </div>
            )}

            <div className="overflow-y-auto flex-1 px-6 py-4">
              {loadingDetalle || !detalle ? (
                <p className="text-center text-gray-400 text-sm py-8">Cargando...</p>
              ) : detalleTab === "articulos" ? (
                <div>
                  {ordenCerrada && (
                    <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-3">
                      {detalle.estado === "Completada"
                        ? "Orden completada — el stock ya fue descontado y los artículos no se pueden modificar."
                        : "Orden cancelada — los artículos no se pueden modificar."}
                    </p>
                  )}
                  {itemsForm.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">Todavía no se agregaron artículos</p>
                  ) : (
                    <table className="w-full text-sm mb-3">
                      <thead>
                        <tr className="text-xs text-gray-500 border-b border-gray-100">
                          <th className="text-left pb-2 font-semibold">Artículo</th>
                          <th className="text-center pb-2 font-semibold w-20">Cant.</th>
                          <th className="text-right pb-2 font-semibold">Precio</th>
                          <th className="text-right pb-2 font-semibold">Subtotal</th>
                          {!ordenCerrada && <th className="w-8"></th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {itemsForm.map((item) => (
                          <tr key={item.articuloId}>
                            <td className="py-2 font-medium text-gray-900 pr-2">
                              {item.label}
                              {!ordenCerrada && <span className="text-xs text-gray-400 ml-1">(stock: {item.stock})</span>}
                            </td>
                            <td className="py-2 text-center">
                              {ordenCerrada ? item.cantidad : (
                                <input type="number" min={1} value={item.cantidad}
                                  onChange={(e) => updateItemCantidad(item.articuloId, e.target.value)}
                                  className="w-16 border border-gray-300 rounded-md px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                              )}
                            </td>
                            <td className="py-2 text-right text-gray-600">{fmt(item.precio)}</td>
                            <td className="py-2 text-right font-semibold text-gray-900">{fmt(item.precio * item.cantidad)}</td>
                            {!ordenCerrada && (
                              <td className="py-2 pl-2">
                                <button type="button" onClick={() => removeItemForm(item.articuloId)} className="text-gray-300 hover:text-red-500 transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {!ordenCerrada && (
                    articulosDisponibles.length > 0 ? (
                      <div className="flex items-center gap-2 mt-2">
                        <Plus className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <select value={articuloToAdd} onChange={handleAddArticulo}
                          className="flex-1 border border-dashed border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                          <option value="">Agregar artículo...</option>
                          {articulosDisponibles.map((a) => (
                            <option key={a.id} value={a.id}>{a.marca} {a.modelo} — {fmt(a.precio)} (stock: {a.stock})</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 text-center mt-2">Todos los artículos disponibles fueron agregados</p>
                    )
                  )}

                  <div className="flex justify-between text-sm font-bold text-gray-900 border-t border-gray-100 mt-3 pt-3">
                    <span>Total</span>
                    <span className="text-blue-600">{fmt(itemsForm.reduce((s, i) => s + i.precio * i.cantidad, 0))}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {detalle.checklist.map((ci) => (
                    <div key={ci.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-gray-50 last:border-0">
                      <span className="text-sm text-gray-700">{ci.descripcion}</span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button type="button" onClick={() => setRespuesta(ci.id, true)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-colors ${ci.respuesta === true ? "bg-green-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-green-100"}`}>
                          Sí
                        </button>
                        <button type="button" onClick={() => setRespuesta(ci.id, false)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-colors ${ci.respuesta === false ? "bg-red-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-red-100"}`}>
                          No
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {detalle && (
              <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
                <button onClick={() => setDetalle(null)} className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">Cerrar</button>
                {detalleTab === "articulos" ? (
                  !ordenCerrada && (
                    <button onClick={handleSaveItems} disabled={savingItems} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg text-sm transition-colors disabled:opacity-60">
                      {savingItems ? "Guardando..." : "Guardar artículos"}
                    </button>
                  )
                ) : (
                  <button onClick={handleSaveChecklist} disabled={savingChecklist} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg text-sm transition-colors disabled:opacity-60">
                    {savingChecklist ? "Guardando..." : "Guardar checklist"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
