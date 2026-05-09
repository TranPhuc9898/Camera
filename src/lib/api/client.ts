import axios, { type AxiosInstance } from 'axios';
import { Env } from '@/config/env';
import { secureStorage, SecureKeys } from '@/lib/auth/secure-storage';

export const apiClient: AxiosInstance = axios.create({
  baseURL: Env.API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await secureStorage.get(SecureKeys.ACCESS_TOKEN);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await secureStorage.remove(SecureKeys.ACCESS_TOKEN);
      await secureStorage.remove(SecureKeys.REFRESH_TOKEN);
    }
    return Promise.reject(error);
  },
);
