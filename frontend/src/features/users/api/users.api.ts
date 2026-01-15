import { api } from "../../../lib/api";
import type { User } from "../types";

export async function fetchUsers() {
  const res = await api.get<User[]>("/users");
  return res.data;
}

export async function createUser(input: {
  nombre: string;
  email: string;
  password: string;
  rol: string;
}) {
  const res = await api.post("/users", input);
  return res.data;
}

export async function updateUser(
  id: number,
  input: { nombre: string; email: string; rol: string }
) {
  const res = await api.patch(`/users/${id}`, input);
  return res.data;
}

export async function deactivateUser(id: number) {
  const res = await api.patch(`/users/${id}/deactivate`);
  return res.data;
}

// ✅ ACTIVAR
export async function activateUser(id: number) {
  const res = await api.patch(`/users/${id}/activate`);
  return res.data;
}

// 🗑 ELIMINAR
export async function deleteUser(id: number) {
  const res = await api.delete(`/users/${id}`);
  return res.data;
}
