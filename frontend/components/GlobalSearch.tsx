"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Users, Package, ShoppingBag, FileText } from "lucide-react";

interface ResultItem {
  id: number;
  label: string;
  sub?: string;
  href: string;
  category: string;
  icon: React.ElementType;
  color: string;
}

let debounceTimer: ReturnType<typeof setTimeout>;

export function GlobalSearch() {
  const router   = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState<ResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive]   = useState(0);

  // Keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 50); }
    else { setQuery(""); setResults([]); setActive(0); }
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const enc = encodeURIComponent(q);
      const [clRes, artRes] = await Promise.allSettled([
        fetch(`/api/clientes?search=${enc}`).then((r) => r.ok ? r.json() : []),
        fetch(`/api/articulos?search=${enc}`).then((r) => r.ok ? r.json() : []),
      ]);

      const all: ResultItem[] = [];

      if (clRes.status === "fulfilled" && Array.isArray(clRes.value)) {
        clRes.value.slice(0, 4).forEach((c: { id: number; nombre: string; apellido: string; telefono?: string }) => {
          all.push({
            id: c.id,
            label: `${c.apellido}, ${c.nombre}`,
            sub: c.telefono || undefined,
            href: "/clientes",
            category: "Clientes",
            icon: Users,
            color: "text-green-600",
          });
        });
      }

      if (artRes.status === "fulfilled" && Array.isArray(artRes.value)) {
        artRes.value.slice(0, 4).forEach((a: { id: number; nombre: string; stock: number; precio: number }) => {
          all.push({
            id: a.id,
            label: a.nombre,
            sub: `Stock: ${a.stock}  ·  $${a.precio.toLocaleString("es-AR", { minimumFractionDigits: 0 })}`,
            href: "/articulos",
            category: "Artículos",
            icon: Package,
            color: "text-blue-600",
          });
        });
      }

      // If query looks like a number, add quick links
      if (/^\d+$/.test(q.trim())) {
        const num = parseInt(q.trim());
        all.push({
          id: num,
          label: `Venta #${num}`,
          sub: "Ir a ventas y buscar",
          href: `/ventas?buscar=${num}`,
          category: "Ventas",
          icon: ShoppingBag,
          color: "text-yellow-600",
        });
        all.push({
          id: num,
          label: `Presupuesto #${num}`,
          sub: "Ir a presupuestos",
          href: `/presupuestos`,
          category: "Presupuestos",
          icon: FileText,
          color: "text-purple-600",
        });
      }

      setResults(all);
      setActive(0);
    } finally { setLoading(false); }
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setQuery(v);
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => search(v), 280);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    if (e.key === "Enter" && results[active]) { navigate(results[active]); }
  }

  function navigate(item: ResultItem) {
    setOpen(false);
    router.push(item.href);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-gray-400 hover:text-gray-600 transition-colors"
        title="Buscar (Ctrl+K)"
        aria-label="Búsqueda global"
      >
        <Search className="w-5 h-5" />
        <span className="hidden sm:inline text-sm text-gray-400">Buscar...</span>
        <kbd className="hidden sm:inline text-[10px] bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5 text-gray-400 font-mono">Ctrl+K</kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center pt-[12vh]">
      <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Buscar clientes, artículos, ventas..."
            className="flex-1 text-base text-gray-900 placeholder-gray-400 focus:outline-none"
          />
          {loading && <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />}
          <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <ul className="max-h-[360px] overflow-y-auto py-2">
            {results.map((item, i) => {
              const Icon = item.icon;
              return (
                <li key={`${item.category}-${item.id}`}>
                  <button
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${i === active ? "bg-blue-50" : "hover:bg-gray-50"}`}
                    onClick={() => navigate(item)}
                    onMouseEnter={() => setActive(i)}
                  >
                    <div className={`p-1.5 rounded-lg bg-gray-100 flex-shrink-0`}>
                      <Icon className={`w-4 h-4 ${item.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">{item.label}</p>
                      {item.sub && <p className="text-xs text-gray-400 truncate">{item.sub}</p>}
                    </div>
                    <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">
                      {item.category}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {query.length >= 2 && !loading && results.length === 0 && (
          <div className="px-4 py-8 text-center text-gray-400 text-sm">
            Sin resultados para &ldquo;{query}&rdquo;
          </div>
        )}

        {query.length < 2 && (
          <div className="px-4 py-6 text-center text-gray-400 text-xs">
            Escribí al menos 2 caracteres para buscar
          </div>
        )}

        <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-3 text-[10px] text-gray-400">
          <span><kbd className="bg-gray-100 border border-gray-200 rounded px-1 font-mono">↑↓</kbd> navegar</span>
          <span><kbd className="bg-gray-100 border border-gray-200 rounded px-1 font-mono">↵</kbd> abrir</span>
          <span><kbd className="bg-gray-100 border border-gray-200 rounded px-1 font-mono">Esc</kbd> cerrar</span>
        </div>
      </div>
    </div>
  );
}
