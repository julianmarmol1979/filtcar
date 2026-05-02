export const SESSION_COOKIE = "filtcar_session";
export const USER_COOKIE = "filtcar_user";
export const ROLE_COOKIE = "filtcar_role";

export type UserRole = "Admin" | "EmpleadoAdmin" | "EmpleadoVentas";

export interface SessionUser {
  id: number;
  nombre: string;
  apellido: string;
  username: string;
  rol: UserRole;
}
