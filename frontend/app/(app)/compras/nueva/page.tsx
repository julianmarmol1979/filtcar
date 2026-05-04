"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, ShoppingBag } from "lucide-react";

interface ProveedorOption { id: number; nombre: string }
interface ArticuloOption  { id: number; marca: string; modelo: string; activo: boolean }

interface LineItem {
  articuloId: number;
  label: string;
  precio: number;
  cantidad: number;
}

function fmt(n: number) {
  return "$" + n.toLocaleString("es-AR", { minimumFractionDigits: 2 });
}

export default function NuevaCompraPage() {
  const router = useRouter();
  const [proveedores, setProveedores]   = useState<ProveedorOption[]>([]);
  const [articulos, setArticulos]       = useState<ArticuloOption[]>([]);
  const [proveedorId, setProveedorId]   = useState<number | "">("");
  const [pagoInmediato, setPagoInmediato] = useState(true);
  const [items, setItems]               = useState<LineItem[]>([]);
  const [articuloToAdd, setArticuloToAdd] = useState<number | "">("");
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState("");

  useEffect(() => {
    fetch("/api/proveedores").then((r) => r.json()).then((data) =>
      setProveedores(data.filter((p: ProveedorOption & { activo: boolean }) => p.activo))
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
    setItems((prev) => [...prev, { articuloId: art.id, label: `${art.marca} ${art.modelo}`, precio: 0, cantidad: 1 }]);
    setArticuloToAdd("");
  }

  function updateItem(articuloId: number, field: "cantidad" | "precio", val: string) {
    setItems((prev) => prev.map((i) => {
      if (i.articuloId !== articuloId) return i;
      const n = parseFloat(val) || 0;
      return { ...i, [field]: field === "cantidad" ? Math.max(1, Math.floor(n)) : Math.max(0, n) };
    }));
  }

  const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!proveedorId)    { setError("Seleccioná un proveedor"); return; }
    if (items.length === 0) { setError("Agregá al menos un artículo"); return; }
    if (items.some((i) => i.precio <= 0)) { setError("Todos los artículos deben tener precio mayor a cero"); return; }

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/compras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proveedorId,
          pagoInmediato,
          items: items.map((i) => ({ articuloId: i.articuloId, cantidad: i.cantidad, precioUnitario: i.precio })),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.message ?? "Error al registrar la compra");
        return;
      }
      router.push("/compras");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/compras")} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Nueva Compra</h1>
          <p className="text-sm text-gray-500 mt-0.5">Registrá una compra a proveedor</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Proveedor + pago */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Proveedor <span className="text-red-500">*</span>
            </label>
            <select value={proveedorId} onChange={(e) => setProveedorId(e.target.value ? parseInt(e.target.value) : "")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">Seleccioná un proveedor...</option>
              {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setPagoInmediato(!pagoInmediato)}
              className={`relative w-10 h-6 rounded-full transition-colors ${pagoInmediato ? "bg-blue-600" : "bg-gray-300"}`}>
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${pagoInmediato ? "translate-x-5" : "translate-x-1"}`} />
            </button>
            <span className="text-sm font-semibold text-gray-700">
              {pagoInmediato ? "Pago inmediato" : "Pago a cuenta (queda pendiente)"}
            </span>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-3">Artículos comprados</h2>
          {items.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Todavía no agregaste artículos</p>
          ) : (
            <table className="w-full text-sm mb-3">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-100">
                  <th className="text-left pb-2 font-semibold">Artículo</th>
                  <th className="text-center pb-2 font-semibold w-20">Cant.</th>
                  <th className="text-right pb-2 font-semibold w-32">P. Compra</th>
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
                        onChange={(e) => updateItem(item.articuloId, "cantidad", e.target.value)}
                        className="w-16 border border-gray-300 rounded-md px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </td>
                    <td className="py-2 text-right">
                      <div className="relative w-28 ml-auto">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                        <input type="number" min={0} step="0.01" value={item.precio}
                          onChange={(e) => updateItem(item.articuloId, "precio", e.target.value)}
                          className="w-full border border-gray-300 rounded-md pl-5 pr-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </td>
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
                  <option key={a.id} value={a.id}>{a.marca} {a.modelo}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Total */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex justify-between items-center">
            <span className="text-base font-bold text-gray-900">Total</span>
            <span className="text-xl font-extrabold text-blue-600">{fmt(total)}</span>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 font-medium">{error}</div>}

        <div className="flex gap-3 pb-6">
          <button type="button" onClick={() => router.push("/compras")}
            className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={saving || items.length === 0}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60">
            <ShoppingBag className="w-4 h-4" />
            {saving ? "Registrando..." : "Confirmar compra"}
          </button>
        </div>
      </form>
    </div>
  );
}
