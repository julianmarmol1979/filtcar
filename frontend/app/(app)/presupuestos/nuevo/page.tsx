"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, FileText } from "lucide-react";

interface ClienteOption  { id: number; nombre: string; apellido: string }
interface ArticuloOption { id: number; marca: string; modelo: string; precio: number; activo: boolean }

interface LineItem {
  articuloId: number;
  label: string;
  precio: number;
  cantidad: number;
}

function fmt(n: number) {
  return "$" + n.toLocaleString("es-AR", { minimumFractionDigits: 2 });
}

function defaultVencimiento() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

export default function NuevoPresupuestoPage() {
  const router = useRouter();
  const [clientes, setClientes]         = useState<ClienteOption[]>([]);
  const [articulos, setArticulos]       = useState<ArticuloOption[]>([]);
  const [clienteId, setClienteId]       = useState<number | "">("");
  const [vencimiento, setVencimiento]   = useState(defaultVencimiento());
  const [observacion, setObservacion]   = useState("");
  const [items, setItems]               = useState<LineItem[]>([]);
  const [articuloToAdd, setArticuloToAdd] = useState<number | "">("");
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState("");

  useEffect(() => {
    fetch("/api/clientes").then((r) => r.json()).then((data) =>
      setClientes(data.filter((c: ClienteOption & { activo: boolean }) => c.activo))
    );
    fetch("/api/articulos").then((r) => r.json()).then((data) =>
      setArticulos(data.filter((a: ArticuloOption) => a.activo))
    );
  }, []);

  const articulosDisponibles = articulos.filter((a) => !items.find((i) => i.articuloId === a.id));

  function handleAddArticulo(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = parseInt(e.target.value);
    if (!id) return;
    const art = articulos.find((a) => a.id === id);
    if (!art) return;
    setItems((prev) => [...prev, { articuloId: art.id, label: `${art.marca} ${art.modelo}`, precio: art.precio, cantidad: 1 }]);
    setArticuloToAdd("");
  }

  function updateCantidad(articuloId: number, val: string) {
    setItems((prev) => prev.map((i) =>
      i.articuloId !== articuloId ? i : { ...i, cantidad: Math.max(1, parseInt(val) || 1) }
    ));
  }

  const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) { setError("Agregá al menos un artículo"); return; }
    if (!vencimiento)       { setError("Ingresá una fecha de vencimiento"); return; }

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/presupuestos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteId:  clienteId || null,
          vencimiento: new Date(vencimiento).toISOString(),
          observacion: observacion || null,
          items: items.map((i) => ({ articuloId: i.articuloId, cantidad: i.cantidad })),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.message ?? "Error al guardar el presupuesto");
        return;
      }
      router.push("/presupuestos");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/presupuestos")} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Nuevo Presupuesto</h1>
          <p className="text-sm text-gray-500 mt-0.5">Generá una cotización para un cliente</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Cliente + Vencimiento + Obs */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Cliente</label>
            <select value={clienteId} onChange={(e) => setClienteId(e.target.value ? parseInt(e.target.value) : "")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">Sin cliente específico</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.apellido}, {c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Vencimiento <span className="text-red-500">*</span>
            </label>
            <input type="date" required value={vencimiento}
              onChange={(e) => setVencimiento(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Observaciones</label>
            <textarea value={observacion} onChange={(e) => setObservacion(e.target.value)} rows={2}
              placeholder="Condiciones, notas al cliente..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-3">Artículos</h2>
          {items.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Todavía no agregaste artículos</p>
          ) : (
            <table className="w-full text-sm mb-3">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-100">
                  <th className="text-left pb-2 font-semibold">Artículo</th>
                  <th className="text-center pb-2 font-semibold w-20">Cant.</th>
                  <th className="text-right pb-2 font-semibold">Precio</th>
                  <th className="text-right pb-2 font-semibold">Subtotal</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item) => (
                  <tr key={item.articuloId}>
                    <td className="py-2 font-medium text-gray-900 pr-2">{item.label}</td>
                    <td className="py-2 text-center">
                      <input type="number" min={1} value={item.cantidad}
                        onChange={(e) => updateCantidad(item.articuloId, e.target.value)}
                        className="w-16 border border-gray-300 rounded-md px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </td>
                    <td className="py-2 text-right text-gray-600">{fmt(item.precio)}</td>
                    <td className="py-2 text-right font-semibold text-gray-900">{fmt(item.precio * item.cantidad)}</td>
                    <td className="py-2 pl-2">
                      <button type="button" onClick={() => setItems((p) => p.filter((i) => i.articuloId !== item.articuloId))}
                        className="text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {articulosDisponibles.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <Plus className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <select value={articuloToAdd} onChange={handleAddArticulo}
                className="flex-1 border border-dashed border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Agregar artículo...</option>
                {articulosDisponibles.map((a) => (
                  <option key={a.id} value={a.id}>{a.marca} {a.modelo} — {fmt(a.precio)}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Total */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex justify-between items-center">
            <span className="text-base font-bold text-gray-900">Total del presupuesto</span>
            <span className="text-xl font-extrabold text-blue-600">{fmt(total)}</span>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 font-medium">{error}</div>}

        <div className="flex gap-3 pb-6">
          <button type="button" onClick={() => router.push("/presupuestos")}
            className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={saving || items.length === 0}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60">
            <FileText className="w-4 h-4" />
            {saving ? "Guardando..." : "Crear presupuesto"}
          </button>
        </div>
      </form>
    </div>
  );
}
