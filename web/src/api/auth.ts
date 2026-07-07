import { apiFetch, setToken, clearToken } from './client';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(res.token);
  return res;
}

export async function fetchMe(): Promise<User> {
  const res = await apiFetch<{ user: User }>('/auth/me');
  return res.user;
}

export function logout(): void {
  clearToken();
}
