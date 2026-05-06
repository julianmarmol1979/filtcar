"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, ChevronLeft, ChevronRight, X, Pencil, Calendar, Clock } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Turno {
  id: number;
  fecha: string;
  clienteNombre: string | null;
  clienteId: number | null;
  cliente: { nombre: string; apellido: string; telefono: string | null } | null;
  telefono: string | null;
  vehiculo: string | null;
  servicio: string;
  observacion: string | null;
  empleadoId: number | null;
  empleado: { nombre: string; apellido: string } | null;
  estado: string;
}

interface Empleado { id: number; nombre: string; apellido: string; }
interface Cliente  { id: number; nombre: string; apellido: string; telefono: string | null; }

// ─── Constants ────────────────────────────────────────────────────────────────
const ESTADOS = ["Pendiente", "Confirmado", "Completado", "Cancelado"] as const;

const ESTADO_STYLE: Record<string, string> = {
  Pendiente:  "bg-yellow-100 text-yellow-700",
  Confirmado: "bg-blue-100 text-blue-700",
  Completado: "bg-green-100 text-green-700",
  Cancelado:  "bg-gray-100 text-gray-500",
};

const SERVICIOS_SUGERIDOS = [
  "Cambio de aceite",
  "Filtro de aceite",
  "Filtro de aire",
  "Filtro de combustible",
  "Filtro de habitáculo",
  "Cambio de aceite de caja",
  "Lubricación de chasis",
  "Revisión general",
];

const emptyForm = {
  fecha: "",
  hora: "",
  clienteId: "" as string | number,
  clienteNombre: "",
  telefono: "",
  vehiculo: "",
  servicio: "",
  observacion: "",
  empleadoId: "" as string | number,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function startOfDay(d: Date) {
  const r = new Date(d); r.setHours(0, 0, 0, 0); return r;
}
function fmtDayHeader(d: Date) {
  return d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
}
function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}
function isToday(d: Date) {
  return isoDate(d) === isoDate(new Date());
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function TurnosPage() {
  // Week navigation: show 7 days starting from weekStart
  const [weekStart, setWeekStart] = useState(() => startOfDay(new Date()));
  const weekEnd   = addDays(weekStart, 6);
  const weekDays  = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const [turnos,    setTurnos]    = useState<Turno[]>([]);
  const [clientes,  setClientes]  = useState<Cliente[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading,   setLoading]   = useState(true);

  // Filters
  const [filterEstado, setFilterEstado] = useState<string>("Todos");

  // Modal state
  const [modalOpen, setModalOpen]   = useState(false);
  const [editing,   setEditing]     = useState<Turno | null>(null);
  const [form,      setForm]        = useState(emptyForm);
  const [saving,    setSaving]      = useState(false);
  const [error,     setError]       = useState("");

  // Estado dropdown open per turno
  const [estadoOpen, setEstadoOpen] = useState<number | null>(null);

  // ── Data fetching ────────────────────────────────────────────────────────
  const fetchTurnos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/turnos?from=${isoDate(weekStart)}&to=${isoDate(weekEnd)}`);
      setTurnos(await res.json());
    } finally { setLoading(false); }
  }, [weekStart]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchTurnos(); }, [fetchTurnos]);

  useEffect(() => {
    Promise.all([
      fetch("/api/clientes").then(r => r.json()),
      fetch("/api/empleados").then(r => r.json()),
    ]).then(([c, e]) => {
      setClientes(c.filter((x: Cliente & { activo: boolean }) => x.activo));
      setEmpleados(e.filter((x: Empleado & { activo: boolean }) => x.activo));
    });
  }, []);

  // ── Week navigation ───────────────────────────────────────────────────────
  function prevWeek() { setWeekStart(prev => addDays(prev, -7)); }
  function nextWeek() { setWeekStart(prev => addDays(prev,  7)); }
  function goToday()  { setWeekStart(startOfDay(new Date())); }

  // ── Modal ─────────────────────────────────────────────────────────────────
  function openCreate(defaultDate?: string) {
    setEditing(null);
    setForm({ ...emptyForm, fecha: defaultDate ?? isoDate(new Date()), hora: "09:00" });
    setError(""); setModalOpen(true);
  }
  function openEdit(t: Turno) {
    setEditing(t);
    const d = new Date(t.fecha);
    setForm({
      fecha:         isoDate(d),
      hora:          d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false }),
      clienteId:     t.clienteId ?? "",
      clienteNombre: t.clienteNombre ?? "",
      telefono:      t.telefono ?? "",
      vehiculo:      t.vehiculo ?? "",
      servicio:      t.servicio,
      observacion:   t.observacion ?? "",
      empleadoId:    t.empleadoId ?? "",
    });
    setError(""); setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.servicio.trim()) { setError("Ingresá el servicio"); return; }
    if (!form.fecha || !form.hora) { setError("Fecha y hora requeridas"); return; }

    setSaving(true); setError("");
    try {
      const fechaISO = new Date(`${form.fecha}T${form.hora}:00`).toISOString();
      const body = {
        fecha:         fechaISO,
        clienteId:     form.clienteId !== "" ? Number(form.clienteId) : null,
        clienteNombre: form.clienteNombre || null,
        telefono:      form.telefono || null,
        vehiculo:      form.vehiculo || null,
        servicio:      form.servicio.trim(),
        observacion:   form.observacion || null,
        empleadoId:    form.empleadoId !== "" ? Number(form.empleadoId) : null,
      };

      const url    = editing ? `/api/turnos/${editing.id}` : "/api/turnos";
      const method = editing ? "PUT" : "POST";
      const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); setError(err.message ?? "Error al guardar"); return; }
      setModalOpen(false); fetchTurnos();
    } finally { setSaving(false); }
  }

  async function handleEstado(id: number, estado: string) {
    setEstadoOpen(null);
    await fetch(`/api/turnos/${id}/estado`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    setTurnos(prev => prev.map(t => t.id === id ? { ...t, estado } : t));
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar este turno?")) return;
    await fetch(`/api/turnos/${id}`, { method: "DELETE" });
    setTurnos(prev => prev.filter(t => t.id !== id));
  }

  // ── Derived data ──────────────────────────────────────────────────────────
  const filtered = filterEstado === "Todos" ? turnos : turnos.filter(t => t.estado === filterEstado);

  function turnosForDay(day: Date) {
    const key = isoDate(day);
    return filtered.filter(t => new Date(t.fecha).toISOString().slice(0, 10) === key);
  }

  function displayName(t: Turno) {
    if (t.cliente) return `${t.cliente.apellido}, ${t.cliente.nombre}`;
    return t.clienteNombre || "Sin nombre";
  }
  function displayTel(t: Turno) {
    return t.cliente?.telefono ?? t.telefono ?? "";
  }

  const weekLabel = `${weekStart.toLocaleDateString("es-AR", { day: "numeric", month: "short" })} – ${weekEnd.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}`;

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">Turnos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Agenda de citas y servicios</p>
        </div>
        <button onClick={() => openCreate()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nuevo turno</span>
        </button>
      </div>

      {/* ── Week nav + status filter ──────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        {/* Week navigation */}
        <div className="flex items-center gap-2">
          <button onClick={prevWeek} className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <span className="text-sm font-semibold text-gray-700 min-w-[180px] text-center">{weekLabel}</span>
          <button onClick={nextWeek} className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
          <button onClick={goToday} className="text-xs font-semibold border border-blue-300 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
            Hoy
          </button>
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {["Todos", ...ESTADOS].map(e => (
            <button key={e} onClick={() => setFilterEstado(e)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                filterEstado === e
                  ? e === "Todos" ? "bg-gray-800 text-white" : ESTADO_STYLE[e] + " ring-2 ring-offset-1 ring-current"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* ── Agenda (7 days) ───────────────────────────────────────── */}
      {loading ? (
        <div className="py-16 text-center text-gray-400 text-sm">Cargando...</div>
      ) : (
        <div className="space-y-4">
          {weekDays.map(day => {
            const dayTurnos = turnosForDay(day);
            const today = isToday(day);
            return (
              <div key={isoDate(day)} className={`bg-white rounded-xl shadow-sm border overflow-hidden ${today ? "border-blue-300" : "border-gray-200"}`}>
                {/* Day header */}
                <div className={`flex items-center justify-between px-5 py-3 border-b ${today ? "bg-blue-600 border-blue-500" : "bg-gray-50 border-gray-200"}`}>
                  <div className="flex items-center gap-2">
                    <Calendar className={`w-4 h-4 ${today ? "text-white" : "text-gray-400"}`} />
                    <h2 className={`text-sm font-bold capitalize ${today ? "text-white" : "text-gray-700"}`}>
                      {fmtDayHeader(day)}
                      {today && <span className="ml-2 text-xs font-semibold bg-white/20 text-white px-2 py-0.5 rounded-full">Hoy</span>}
                    </h2>
                  </div>
                  <button
                    onClick={() => openCreate(isoDate(day))}
                    className={`text-xs font-semibold flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors ${today ? "bg-white/20 hover:bg-white/30 text-white" : "border border-gray-300 text-gray-600 hover:bg-gray-100"}`}
                  >
                    <Plus className="w-3 h-3" /> Turno
                  </button>
                </div>

                {/* Turnos list */}
                {dayTurnos.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-5">Sin turnos</p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {dayTurnos.map(t => (
                      <div key={t.id} className={`flex flex-wrap items-start gap-3 px-5 py-3 hover:bg-gray-50 transition-colors ${t.estado === "Cancelado" ? "opacity-50" : ""}`}>
                        {/* Time */}
                        <div className="flex items-center gap-1 text-gray-500 w-14 flex-shrink-0 mt-0.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="text-xs font-bold">{fmtHora(t.fecha)}</span>
                        </div>

                        {/* Main info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{displayName(t)}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
                            <p className="text-xs text-blue-700 font-medium">{t.servicio}</p>
                            {t.vehiculo && <p className="text-xs text-gray-500">🚗 {t.vehiculo}</p>}
                            {displayTel(t) && <p className="text-xs text-gray-500">📞 {displayTel(t)}</p>}
                            {t.empleado && <p className="text-xs text-gray-400">👷 {t.empleado.apellido}, {t.empleado.nombre}</p>}
                            {t.observacion && <p className="text-xs text-gray-400 italic truncate max-w-xs">{t.observacion}</p>}
                          </div>
                        </div>

                        {/* Status + actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Estado dropdown */}
                          <div className="relative">
                            <button
                              onClick={() => setEstadoOpen(estadoOpen === t.id ? null : t.id)}
                              className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 transition-colors ${ESTADO_STYLE[t.estado] ?? "bg-gray-100 text-gray-600"}`}
                            >
                              {t.estado}
                              <ChevronLeft className="w-3 h-3 -rotate-90" />
                            </button>
                            {estadoOpen === t.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setEstadoOpen(null)} />
                                <div className="absolute right-0 top-8 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[140px]">
                                  {ESTADOS.map(e => (
                                    <button key={e} onClick={() => handleEstado(t.id, e)}
                                      className={`w-full text-left text-xs font-semibold px-4 py-2 hover:bg-gray-50 transition-colors ${t.estado === e ? "text-blue-600" : "text-gray-700"}`}>
                                      {e}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                          <button onClick={() => openEdit(t)} className="text-gray-400 hover:text-blue-600 transition-colors p-1">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(t.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── New / Edit Modal ──────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-auto p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">{editing ? "Editar turno" : "Nuevo turno"}</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Date + Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha <span className="text-red-500">*</span></label>
                  <input type="date" required value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Hora <span className="text-red-500">*</span></label>
                  <input type="time" required value={form.hora} onChange={e => setForm({ ...form, hora: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* Client */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Cliente</label>
                <select value={form.clienteId} onChange={e => {
                  const id = e.target.value;
                  const c  = clientes.find(x => x.id === Number(id));
                  setForm({ ...form, clienteId: id, clienteNombre: "", telefono: c?.telefono ?? form.telefono });
                }} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">— Sin cliente registrado —</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.apellido}, {c.nombre}</option>
                  ))}
                </select>
              </div>

              {form.clienteId === "" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre del cliente</label>
                  <input type="text" value={form.clienteNombre} onChange={e => setForm({ ...form, clienteNombre: e.target.value })}
                    placeholder="Ej: Juan García"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              )}

              {/* Phone + Vehicle */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Teléfono</label>
                  <input type="tel" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })}
                    placeholder="2614 123456"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Vehículo / Patente</label>
                  <input type="text" value={form.vehiculo} onChange={e => setForm({ ...form, vehiculo: e.target.value })}
                    placeholder="Ej: AA123BB"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* Service */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Servicio <span className="text-red-500">*</span></label>
                <input type="text" required value={form.servicio} onChange={e => setForm({ ...form, servicio: e.target.value })}
                  list="servicios-list" placeholder="Ej: Cambio de aceite"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <datalist id="servicios-list">
                  {SERVICIOS_SUGERIDOS.map(s => <option key={s} value={s} />)}
                </datalist>
                {/* Quick select chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {SERVICIOS_SUGERIDOS.slice(0, 5).map(s => (
                    <button key={s} type="button" onClick={() => setForm({ ...form, servicio: s })}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${form.servicio === s ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Employee */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Empleado asignado</label>
                <select value={form.empleadoId} onChange={e => setForm({ ...form, empleadoId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">— Sin asignar —</option>
                  {empleados.map(e => (
                    <option key={e.id} value={e.id}>{e.apellido}, {e.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Observaciones</label>
                <textarea value={form.observacion} onChange={e => setForm({ ...form, observacion: e.target.value })}
                  rows={2} placeholder="Opcional — notas adicionales"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>

              {error && (
                <p className="text-sm text-red-600 font-medium">{error}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg text-sm transition-colors disabled:opacity-60">
                  {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear turno"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
