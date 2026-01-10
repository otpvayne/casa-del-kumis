import axios from "axios";
import { getToken, logout } from "./auth";

const baseURL = import.meta.env.VITE_API_URL;

export const api = axios.create({
  baseURL,
  timeout: 30_000,
});

// Request: mete token si existe
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response: si 401 -> logout (token malo/expirado)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      logout();
      // opcional: redirigir a /login
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);
