import { api } from "@/lib/api";
import { User } from "../types";

export async function fetchUsers() {
  const { data } = await api.get<User[]>("/users");
  return data;
}

export async function createUser(payload: {
  nombre: string;
  email: string;
  password: string;
  rol: string;
}) {
  return api.post("/users", payload);
}

export async function updateUser(
  id: number,
  payload: Partial<Pick<User, "nombre" | "email" | "rol">>
) {
  return api.patch(`/users/${id}`, payload);
}

export async function deactivateUser(id: number) {
  return api.patch(`/users/${id}/deactivate`);
}
