"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, KeyRound, X, Loader2, Eye, EyeOff } from "lucide-react";

interface AccountMenuProps {
  username: string;
  rol: string;
  fotoUrl: string | null;
  onFotoUpdated: (url: string) => void;
}

export function AccountMenu({ username, rol, fotoUrl, onFotoUpdated }: AccountMenuProps) {
  const [open, setOpen]               = useState(false);
  const [photoModalOpen, setPhotoModalOpen]     = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full rounded-lg px-1 py-1 -mx-1 hover:bg-gray-800 transition-colors text-left"
      >
        <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fotoUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[10px] font-bold text-white uppercase">{username.charAt(0)}</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-200 truncate">{username}</p>
          <p className="text-[10px] text-blue-400">{rol}</p>
        </div>
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-1 rounded-xl overflow-hidden z-50 bg-gray-800 border border-gray-700 shadow-lg">
          <button
            onClick={() => { setPhotoModalOpen(true); setOpen(false); }}
            className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-xs font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <Camera className="w-3.5 h-3.5 shrink-0" /> Cambiar foto
          </button>
          <button
            onClick={() => { setPasswordModalOpen(true); setOpen(false); }}
            className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-xs font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <KeyRound className="w-3.5 h-3.5 shrink-0" /> Cambiar contraseña
          </button>
        </div>
      )}

      {photoModalOpen && (
        <PhotoModal onClose={() => setPhotoModalOpen(false)} onUploaded={onFotoUpdated} />
      )}
      {passwordModalOpen && (
        <PasswordModal onClose={() => setPasswordModalOpen(false)} />
      )}
    </div>
  );
}

function ModalShell({ title, icon: Icon, onClose, children }: {
  title: string; icon: React.ElementType; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PhotoModal({ onClose, onUploaded }: { onClose: () => void; onUploaded: (url: string) => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile]       = useState<File | null>(null);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setError("");
    setPreview(URL.createObjectURL(f));
  }

  async function handleSubmit() {
    if (!file) return;
    setLoading(true); setError("");
    try {
      const formData = new FormData();
      formData.append("foto", file);
      const res = await fetch("/api/auth/foto", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? "No se pudo subir la foto");
        return;
      }
      onUploaded(data.fotoUrl);
      onClose();
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalShell title="Cambiar foto de perfil" icon={Camera} onClose={onClose}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden bg-gray-100 border border-gray-200">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="w-full h-full object-cover" />
          ) : (
            <Camera className="w-8 h-8 text-gray-300" />
          )}
        </div>
        <label className="cursor-pointer text-sm font-semibold text-blue-700 border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-lg px-4 py-2 transition-colors">
          Elegir imagen
          <input type="file" accept="image/*" onChange={handlePick} className="hidden" />
        </label>

        {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={!file || loading}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg py-2 text-sm transition-colors disabled:opacity-60"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo...</> : "Guardar foto"}
        </button>
      </div>
    </ModalShell>
  );
}

function PasswordModal({ onClose }: { onClose: () => void }) {
  const [actual, setActual]       = useState("");
  const [nueva, setNueva]         = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [showActual, setShowActual] = useState(false);
  const [showNueva, setShowNueva]   = useState(false);
  const [error, setError]         = useState("");
  const [ok, setOk]               = useState(false);
  const [saving, setSaving]       = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (nueva !== confirmar) { setError("Las contraseñas nuevas no coinciden"); return; }
    if (nueva.length < 6) { setError("La contraseña debe tener al menos 6 caracteres"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/auth/cambiar-password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passwordActual: actual, passwordNueva: nueva }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.message ?? "Error al cambiar la contraseña");
        return;
      }
      setOk(true);
      setTimeout(onClose, 1500);
    } finally { setSaving(false); }
  }

  return (
    <ModalShell title="Cambiar contraseña" icon={KeyRound} onClose={onClose}>
      {ok ? (
        <div className="py-8 text-center">
          <p className="text-green-600 font-semibold text-lg">✓ Contraseña actualizada</p>
          <p className="text-sm text-gray-400 mt-1">El modal se cerrará en un momento...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Contraseña actual</label>
            <div className="relative">
              <input
                type={showActual ? "text" : "password"}
                required
                value={actual}
                onChange={(e) => setActual(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tu contraseña actual"
              />
              <button type="button" onClick={() => setShowActual(!showActual)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showActual ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Nueva contraseña</label>
            <div className="relative">
              <input
                type={showNueva ? "text" : "password"}
                required
                value={nueva}
                onChange={(e) => setNueva(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Mínimo 6 caracteres"
              />
              <button type="button" onClick={() => setShowNueva(!showNueva)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showNueva ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Confirmar nueva contraseña</label>
            <input
              type="password"
              required
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Repetí la nueva contraseña"
            />
          </div>

          {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg text-sm transition-colors disabled:opacity-60">
              {saving ? "Guardando..." : "Cambiar"}
            </button>
          </div>
        </form>
      )}
    </ModalShell>
  );
}
