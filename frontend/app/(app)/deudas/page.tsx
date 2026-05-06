"use client";

import { useEffect, useState, useCallback } from "react";
import { CreditCard, X, AlertCircle } from "lucide-react";
import Pagination from "@/components/Pagination";

interface Deuda {
  id: number;
  creadaEn: string;
  cliente: { id: number; nombre: string; apellido: string; telefono: string | null };
  ventaId: number;
  ventaFecha: string;
  montoOriginal: number;
  montoPagado: number;
  saldoPendiente: number;
}

function fmt(n: number) {
  return "$" + n.toLocaleString("es-AR", { minimumFractionDigits: 2 });
}
function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

export default function DeudasPage() {
  const [deudas, setDeudas]       = useState<Deuda[]>([]);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState(10);
  const [modalDeuda, setModalDeuda] = useState<Deuda | null>(null);
  const [monto, setMonto]         = useState("");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  const fetchDeudas = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/deudas");
      const data = await res.json();
      setDeudas(data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDeudas(); }, [fetchDeudas]);

  const paged = deudas.slice((page - 1) * pageSize, page * pageSize);

  const totalPendiente = deudas.reduce((s, d) => s + d.saldoPendiente, 0);

  function openPago(d: Deuda) {
    setModalDeuda(d);
    setMonto(d.saldoPendiente.toFixed(2));
    setError("");
  }

  async function handlePago(e: React.FormEvent) {
    e.preventDefault();
    if (!modalDeuda) return;
    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) { setError("Ingresá un monto válido"); return; }
    if (montoNum > modalDeuda.saldoPendiente) { setError("El monto supera el saldo pendiente"); return; }

    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/deudas/${modalDeuda.id}/pagar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monto: montoNum }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.message ?? "Error al registrar el pago");
        return;
      }
      setModalDeuda(null);
      fetchDeudas();
    } finally { setSaving(false); }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">Deudas de clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Ventas pendientes de cobro</p>
        </div>
      </div>

      {/* Summary card */}
      {!loading && deudas.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
            Total pendiente — {deudas.length} {deudas.length === 1 ? "deuda" : "deudas"}
          </p>
          <p className="text-3xl font-extrabold text-red-700">{fmt(totalPendiente)}</p>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Cargando...</div>
        ) : deudas.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-2 text-gray-400">
            <CreditCard className="w-10 h-10" />
            <p className="text-sm font-medium">No hay deudas pendientes</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Cliente</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Fecha venta</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Original</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Pagado</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Saldo</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paged.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">
                        {d.cliente.apellido}, {d.cliente.nombre}
                      </p>
                      {d.cliente.telefono && (
                        <p className="text-xs text-gray-400">{d.cliente.telefono}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs hidden sm:table-cell">
                      {fmtFecha(d.ventaFecha)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmt(d.montoOriginal)}</td>
                    <td className="px-4 py-3 text-right text-green-700 hidden md:table-cell">
                      {d.montoPagado > 0 ? fmt(d.montoPagado) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-red-700">{fmt(d.saldoPendiente)}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => openPago(d)}
                        className="inline-flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        Cobrar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              total={deudas.length}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </div>

      {/* Payment modal */}
      {modalDeuda && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModalDeuda(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Registrar cobro</h2>
              <button onClick={() => setModalDeuda(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Debt summary */}
            <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-1.5">
              <p className="text-sm font-bold text-gray-900">
                {modalDeuda.cliente.apellido}, {modalDeuda.cliente.nombre}
              </p>
              <p className="text-xs text-gray-500">Venta del {fmtFecha(modalDeuda.ventaFecha)}</p>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-gray-500">Monto original</span>
                <span className="font-medium">{fmt(modalDeuda.montoOriginal)}</span>
              </div>
              {modalDeuda.montoPagado > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Ya cobrado</span>
                  <span className="text-green-700 font-medium">{fmt(modalDeuda.montoPagado)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm border-t border-gray-200 pt-1.5">
                <span className="font-semibold text-gray-700">Saldo pendiente</span>
                <span className="font-bold text-red-700">{fmt(modalDeuda.saldoPendiente)}</span>
              </div>
            </div>

            <form onSubmit={handlePago} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Monto a cobrar <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={modalDeuda.saldoPendiente}
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Podés cobrar un pago parcial o el total
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-600 font-medium">{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setModalDeuda(null)}
                  className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg text-sm transition-colors disabled:opacity-60"
                >
                  {saving ? "Registrando..." : "Confirmar cobro"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
