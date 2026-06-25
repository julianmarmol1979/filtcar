import { NextResponse } from "next/server";
import { requireAuth, proxyFetch } from "@/lib/server-auth";

// Listado liviano de empleados activos, usado por Turnos para asignar el responsable de un turno.
// La gestión completa de usuarios (crear/editar/activar) vive en /api/usuarios, restringida a Admin/EmpleadoAdmin.
export async function GET(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const query = search ? `?search=${encodeURIComponent(search)}` : "";

  const res = await proxyFetch(`/api/empleados${query}`);
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
