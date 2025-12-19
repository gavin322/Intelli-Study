import { http } from './http';

export interface AuthResponse {
  accessToken: string;
}

export const login = (email: string, password: string) =>
  http.post<AuthResponse>('/auth/login', { email, password }).then((res) => res.data);

export const register = (payload: { email: string; password: string; displayName?: string }) =>
  http.post<AuthResponse>('/auth/register', payload).then((res) => res.data);

export const forgotPassword = (email: string) =>
  http.post('/auth/forgot-password', { email }).then((res) => res.data);
