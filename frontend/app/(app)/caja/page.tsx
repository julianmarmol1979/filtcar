"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, X, Wallet } from "lucide-react";
import Pagination from "@/components/Pagination";

interface Movimiento {
  id: number;
  fecha: string;
  tipo: string;
  monto: number;
  observacion: string | null;
  empleado: string;
}

const TIPOS = [
  { value: "Apertura", label: "Apertura", color: "bg-blue-100 text-blue-700",      sign: +1 },
  { value: "Ingreso",  label: "Ingreso",  color: "bg-green-100 text-green-700",    sign: +1 },
  { value: "Retiro",   label: "Retiro",   color: "bg-red-100 text-red-700",        sign: -1 },
  { value: "Arqueo",   label: "Arqueo",   color: "bg-yellow-100 text-yellow-700",  sign:  0 },
  { value: "Cierre",   label: "Cierre",   color: "bg-gray-100 text-gray-600",      sign:  0 },
];

function tipoMeta(tipo: string) {
  return TIPOS.find((t) => t.value === tipo) ?? { label: tipo, color: "bg-gray-100 text-gray-600", sign: 0 };
}
function fmt(n: number) { return "$" + Math.abs(n).toLocaleString("es-AR", { minimumFractionDigits: 2 }); }
function fmtFecha(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
    + " " + d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

export default function CajaPage() {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [balance, setBalance]         = useState(0);
  const [loading, setLoading]         = useState(true);
  const [modalOpen, setModalOpen]     = useState(false);
  const [form, setForm]               = useState({ tipo: "Ingreso", monto: 0, observacion: "" });
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");
  const [page, setPage]               = useState(1);
  const [pageSize, setPageSize]       = useState(10);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/caja");
      const data = await res.json();
      setMovimientos(data.movimientos);
      setBalance(data.balance);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const paged = movimientos.slice((page - 1) * pageSize, page * pageSize);

  function openModal() { setForm({ tipo: "Ingreso", monto: 0, observacion: "" }); setError(""); setModalOpen(true); }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (form.monto <= 0) { setError("El monto debe ser mayor a cero"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/caja", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); setError(err.message ?? "Error al guardar"); return; }
      setModalOpen(false);
      fetchData();
    } finally { setSaving(false); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Caja</h1>
          <p className="text-sm text-gray-500 mt-0.5">Movimientos y saldo del lubricentro</p>
        </div>
        <button onClick={openModal}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Nuevo movimiento
        </button>
      </div>

      <div className={`rounded-xl p-5 mb-5 border ${balance >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Saldo actual</p>
        <p className={`text-3xl font-extrabold ${balance >= 0 ? "text-green-700" : "text-red-700"}`}>
          {balance < 0 ? "-" : ""}{fmt(balance)}
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Cargando...</div>
        ) : movimientos.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-2 text-gray-400">
            <Wallet className="w-10 h-10" />
            <p className="text-sm font-medium">No hay movimientos registrados</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Fecha</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Tipo</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Observación</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Monto</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Empleado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paged.map((m) => {
                  const meta = tipoMeta(m.tipo);
                  return (
                    <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-500 text-xs">{fmtFecha(m.fecha)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${meta.color}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                        {m.observacion || <span className="text-gray-300">—</span>}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold ${meta.sign > 0 ? "text-green-700" : meta.sign < 0 ? "text-red-700" : "text-gray-700"}`}>
                        {meta.sign < 0 ? "-" : meta.sign > 0 ? "+" : ""}{fmt(m.monto)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs hidden sm:table-cell">{m.empleado}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Pagination total={movimientos.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
          </>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Nuevo movimiento</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Tipo <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-3 gap-2">
                  {TIPOS.map((t) => (
                    <button key={t.value} type="button" onClick={() => setForm({ ...form, tipo: t.value })}
                      className={`py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${form.tipo === t.value ? t.color + " border-transparent" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Monto <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                  <input type="number" min={0} step="0.01" required value={form.monto}
                    onChange={(e) => setForm({ ...form, monto: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Observación</label>
                <input type="text" value={form.observacion} onChange={(e) => setForm({ ...form, observacion: e.target.value })}
                  placeholder={form.tipo === "Arqueo" ? "Monto contado en caja" : form.tipo === "Retiro" ? "Motivo del retiro" : "Opcional"}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg text-sm transition-colors disabled:opacity-60">
                  {saving ? "Guardando..." : "Registrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
