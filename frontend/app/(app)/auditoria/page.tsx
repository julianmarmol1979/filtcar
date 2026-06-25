"use client";

import { useEffect, useState } from "react";
import { ScrollText, X, ShieldAlert, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 25;

interface LogEntry {
  id: number;
  username: string;
  action: string;
  description: string;
  createdAt: string;
}

const ACTION_COLOR: Record<string, string> = {
  Login:            "bg-gray-100 text-gray-600",
  CambiarPassword:  "bg-yellow-100 text-yellow-700",
  SubirFoto:        "bg-yellow-100 text-yellow-700",
  VentaCreate:      "bg-green-100 text-green-700",
  CompraCreate:     "bg-blue-100 text-blue-700",
  CajaMovimiento:   "bg-purple-100 text-purple-700",
  DeudaPago:        "bg-green-100 text-green-700",
  PresupuestoCreate:"bg-indigo-100 text-indigo-700",
  TurnoCreate:      "bg-cyan-100 text-cyan-700",
  TurnoUpdate:      "bg-cyan-100 text-cyan-700",
  TurnoEstado:      "bg-cyan-100 text-cyan-700",
  TurnoDelete:      "bg-red-100 text-red-700",
  UsuarioCreate:    "bg-red-100 text-red-700",
  UsuarioUpdate:    "bg-red-100 text-red-700",
  UsuarioToggle:    "bg-red-100 text-red-700",
  ArticuloCreate:   "bg-blue-100 text-blue-700",
  ArticuloUpdate:   "bg-blue-100 text-blue-700",
  ArticuloToggle:   "bg-blue-100 text-blue-700",
  ClienteCreate:    "bg-blue-100 text-blue-700",
  ClienteUpdate:    "bg-blue-100 text-blue-700",
  ClienteToggle:    "bg-blue-100 text-blue-700",
  ProveedorCreate:  "bg-blue-100 text-blue-700",
  ProveedorUpdate:  "bg-blue-100 text-blue-700",
  ProveedorToggle:  "bg-blue-100 text-blue-700",
};

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function AuditoriaPage() {
  const [logs, setLogs]         = useState<LogEntry[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [desde, setDesde]       = useState("");
  const [hasta, setHasta]       = useState("");
  const [loading, setLoading]   = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    const qs = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (desde) qs.set("from", desde);
    if (hasta) qs.set("to", hasta);

    setLoading(true);
    fetch(`/api/activity-logs?${qs}`)
      .then((res) => {
        if (res.status === 403) { setForbidden(true); return null; }
        return res.ok ? res.json() : Promise.reject();
      })
      .then((data) => { if (data) { setLogs(data.items); setTotal(data.total); } })
      .catch(() => { setLogs([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [page, desde, hasta]);

  function clearFilters() { setDesde(""); setHasta(""); setPage(1); }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (forbidden) {
    return (
      <div className="py-20 flex flex-col items-center gap-2 text-gray-400">
        <ShieldAlert className="w-10 h-10" />
        <p className="text-sm font-medium">No tenés permiso para ver esta sección</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 flex items-center gap-2">
          <ScrollText className="w-6 h-6 text-gray-400" /> Auditoría
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Actividad del sistema: quién hizo cada acción y cuándo</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        {/* Date filters */}
        <div className="flex flex-wrap items-end gap-2 mb-4">
          <div className="flex items-center gap-1">
            <label className="text-xs text-gray-500 font-medium whitespace-nowrap">Desde</label>
            <input type="date" value={desde} onChange={(e) => { setDesde(e.target.value); setPage(1); }}
              className="text-sm border border-gray-300 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-36" />
          </div>
          <div className="flex items-center gap-1">
            <label className="text-xs text-gray-500 font-medium whitespace-nowrap">Hasta</label>
            <input type="date" value={hasta} onChange={(e) => { setHasta(e.target.value); setPage(1); }}
              min={desde || undefined}
              className="text-sm border border-gray-300 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-36" />
          </div>
          {(desde || hasta) && (
            <button onClick={clearFilters}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 px-3 py-2 rounded-lg transition-colors">
              <X className="w-3.5 h-3.5" /> Limpiar
            </button>
          )}
        </div>

        {/* List */}
        {loading ? (
          <p className="text-sm py-8 text-center text-gray-400">Cargando...</p>
        ) : logs.length === 0 ? (
          <p className="text-sm py-8 text-center text-gray-400">Sin actividad registrada.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 text-sm">
                <span className="text-xs text-gray-400 shrink-0 w-36">{fmtFecha(log.createdAt)}</span>
                <span className="font-semibold text-gray-700 shrink-0 w-28 truncate">@{log.username}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${ACTION_COLOR[log.action] ?? "bg-gray-100 text-gray-600"}`}>
                  {log.action}
                </span>
                <span className="flex-1 truncate text-gray-600">{log.description}</span>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-gray-100 flex-wrap">
            <p className="text-xs text-gray-400">
              Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de {total}
            </p>
            {pageCount > 1 && (
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-gray-500 px-2">Página {page} de {pageCount}</span>
                <button onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page === pageCount}
                  className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
