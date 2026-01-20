import { api } from "../../../lib/api"; // usa el mismo api que vouchers

export async function getDashboardData() {
  const { data } = await api.get("/dashboard");
  return data;
}
