import { API_BASE, type ApiResponse } from '@dashboard/shared';

// Empty by default → same origin (Express serves both the SPA and the API).
const API_URL = import.meta.env.VITE_API_URL ?? '';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiGet<T>(resource: string): Promise<T> {
  const res = await fetch(`${API_URL}${API_BASE}${resource}`);
  if (!res.ok) {
    throw new ApiError(res.status, `GET ${resource} failed (${res.status})`);
  }
  const body = (await res.json()) as ApiResponse<T>;
  return body.data;
}

export async function apiGetRaw<T>(resource: string): Promise<T> {
  const res = await fetch(`${API_URL}${API_BASE}${resource}`);
  if (!res.ok) {
    throw new ApiError(res.status, `GET ${resource} failed (${res.status})`);
  }
  return (await res.json()) as T;
}
