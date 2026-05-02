const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Error desconocido" }));
    throw new Error(error.message ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}
