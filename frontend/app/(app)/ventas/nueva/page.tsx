"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, ShoppingCart } from "lucide-react";

interface ClienteOption {
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

interface LineItem {
  articuloId: number;
  label: string;
  precio: number;
  stock: number;
  cantidad: number;
}

type FormaPago = "Contado" | "Tarjeta" | "Deposito" | "Deuda";

const FORMAS_PAGO: { value: FormaPago; label: string; color: string }[] = [
  { value: "Contado",  label: "Contado",   color: "bg-green-600 text-white border-green-600" },
  { value: "Tarjeta",  label: "Tarjeta",   color: "bg-blue-600 text-white border-blue-600" },
  { value: "Deposito", label: "Depósito",  color: "bg-purple-600 text-white border-purple-600" },
  { value: "Deuda",    label: "Deuda",     color: "bg-red-600 text-white border-red-600" },
];

function fmt(n: number) {
  return "$" + n.toLocaleString("es-AR", { minimumFractionDigits: 2 });
}

interface PresupuestoItemPre {
  articuloId: number;
  articulo: string;
  stock: number;
  cantidad: number;
  precioUnitario: number;
}
interface PresupuestoPre {
  clienteId: number | null;
  items: PresupuestoItemPre[];
}

export default function NuevaVentaPage() {
  const router = useRouter();

  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [articulos, setArticulos] = useState<ArticuloOption[]>([]);
  const [clienteId, setClienteId] = useState<number | "">("");
  const [items, setItems] = useState<LineItem[]>([]);
  const [articuloToAdd, setArticuloToAdd] = useState<number | "">("");
  const [descuento, setDescuento] = useState<number>(0);
  const [formaPago, setFormaPago] = useState<FormaPago>("Contado");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fromPresupuesto, setFromPresupuesto] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromId = params.get("from");

    Promise.all([
      fetch("/api/clientes").then((r) => r.json()),
      fetch("/api/articulos").then((r) => r.json()),
      fromId ? fetch(`/api/presupuestos/${fromId}`).then((r) => r.json()) : Promise.resolve(null),
    ]).then(([clientesData, articulosData, presData]: [
      (ClienteOption & { activo: boolean })[],
      ArticuloOption[],
      PresupuestoPre | null
    ]) => {
      setClientes(clientesData.filter((c) => c.activo));
      const arts = articulosData.filter((a) => a.activo);
      setArticulos(arts);

      if (presData) {
        setFromPresupuesto(true);
        if (presData.clienteId) setClienteId(presData.clienteId);
        const preItems: LineItem[] = presData.items
          .map((item) => {
            const art = arts.find((a) => a.id === item.articuloId);
            const stock = art?.stock ?? item.stock;
            return {
              articuloId: item.articuloId,
              label: item.articulo,
              precio: item.precioUnitario,
              stock,
              cantidad: Math.min(item.cantidad, Math.max(stock, 0)),
            };
          })
          .filter((item) => item.stock > 0);
        setItems(preItems);
      }
    });
  }, []);

  // Available articles: active, with stock, not yet added to the list
  const articulosDisponibles = articulos.filter(
    (a) => a.stock > 0 && !items.find((i) => i.articuloId === a.id)
  );

  function handleAddArticulo(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = parseInt(e.target.value);
    if (!id) return;
    const art = articulos.find((a) => a.id === id);
    if (!art) return;
    setItems((prev) => [
      ...prev,
      { articuloId: art.id, label: `${art.marca} ${art.modelo}`, precio: art.precio, stock: art.stock, cantidad: 1 },
    ]);
    setArticuloToAdd("");
  }

  function updateCantidad(articuloId: number, val: string) {
    const n = parseInt(val);
    setItems((prev) =>
      prev.map((i) => {
        if (i.articuloId !== articuloId) return i;
        const cantidad = isNaN(n) || n < 1 ? 1 : Math.min(n, i.stock);
        return { ...i, cantidad };
      })
    );
  }

  function removeItem(articuloId: number) {
    setItems((prev) => prev.filter((i) => i.articuloId !== articuloId));
  }

  const subtotal = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const total = Math.max(0, subtotal - descuento);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) { setError("Agregá al menos un artículo"); return; }
    if (formaPago === "Deuda" && !clienteId) { setError("Seleccioná un cliente para ventas en deuda"); return; }

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/ventas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteId: clienteId || null,
          descuento,
          formaPago,
          items: items.map((i) => ({ articuloId: i.articuloId, cantidad: i.cantidad })),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.message ?? "Error al registrar la venta");
        return;
      }
      router.push("/ventas");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push("/ventas")}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Nueva Venta</h1>
          <p className="text-sm text-gray-500 mt-0.5">Registrá los artículos vendidos</p>
        </div>
      </div>

      {fromPresupuesto && (
        <div className="mb-5 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <p className="text-sm text-blue-700 font-medium">
            Artículos pre-cargados desde el presupuesto. Revisá los datos y confirmá la venta.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Cliente */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <label className="block text-sm font-bold text-gray-700 mb-2">Cliente</label>
          <select
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value ? parseInt(e.target.value) : "")}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Mostrador (sin cliente)</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.apellido}, {c.nombre}
              </option>
            ))}
          </select>
          {formaPago === "Deuda" && !clienteId && (
            <p className="text-xs text-red-500 mt-1">Requerido para ventas en deuda</p>
          )}
        </div>

        {/* Items */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-3">Artículos</h2>

          {items.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              Todavía no agregaste artículos
            </p>
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
                    <td className="py-2 font-medium text-gray-900 pr-2">{item.label}
                      <span className="text-xs text-gray-400 ml-1">(stock: {item.stock})</span>
                    </td>
                    <td className="py-2 text-center">
                      <input
                        type="number"
                        min={1}
                        max={item.stock}
                        value={item.cantidad}
                        onChange={(e) => updateCantidad(item.articuloId, e.target.value)}
                        className="w-16 border border-gray-300 rounded-md px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-2 text-right text-gray-600">{fmt(item.precio)}</td>
                    <td className="py-2 text-right font-semibold text-gray-900">
                      {fmt(item.precio * item.cantidad)}
                    </td>
                    <td className="py-2 pl-2">
                      <button
                        type="button"
                        onClick={() => removeItem(item.articuloId)}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Add article */}
          {articulosDisponibles.length > 0 ? (
            <div className="flex items-center gap-2 mt-2">
              <Plus className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <select
                value={articuloToAdd}
                onChange={handleAddArticulo}
                className="flex-1 border border-dashed border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Agregar artículo...</option>
                {articulosDisponibles.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.marca} {a.modelo} — {fmt(a.precio)} (stock: {a.stock})
                  </option>
                ))}
              </select>
            </div>
          ) : items.length === 0 ? (
            <p className="text-xs text-gray-400 text-center mt-2">No hay artículos con stock disponible</p>
          ) : (
            <p className="text-xs text-gray-400 text-center mt-2">Todos los artículos disponibles fueron agregados</p>
          )}
        </div>

        {/* Summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-3">Resumen</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span className="font-medium">{fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between items-center text-sm text-gray-600">
              <label htmlFor="descuento">Descuento</label>
              <div className="relative w-36">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                <input
                  id="descuento"
                  type="number"
                  min={0}
                  max={subtotal}
                  step="0.01"
                  value={descuento}
                  onChange={(e) => setDescuento(parseFloat(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-100 pt-2">
              <span>Total</span>
              <span className="text-blue-600">{fmt(total)}</span>
            </div>
          </div>
        </div>

        {/* Forma de pago */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-3">Forma de pago</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {FORMAS_PAGO.map((fp) => (
              <button
                key={fp.value}
                type="button"
                onClick={() => setFormaPago(fp.value)}
                className={`py-2 rounded-lg text-sm font-semibold border-2 transition-all ${
                  formaPago === fp.value
                    ? fp.color
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {fp.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 font-medium">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pb-6">
          <button
            type="button"
            onClick={() => router.push("/ventas")}
            className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || items.length === 0}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60"
          >
            <ShoppingCart className="w-4 h-4" />
            {saving ? "Registrando..." : "Confirmar venta"}
          </button>
        </div>
      </form>
    </div>
  );
}
