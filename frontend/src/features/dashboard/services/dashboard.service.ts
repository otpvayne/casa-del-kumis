import { api } from "../../../lib/api";

export async function getDashboardData() {
  const { data } = await api.get("/dashboard");
  return data;
}
