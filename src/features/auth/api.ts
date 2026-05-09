import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { secureStorage, SecureKeys } from '@/lib/auth/secure-storage';
import { useAuthStore } from './use-auth-store';
import type { AuthTokens, LoginPayload, RegisterPayload, User } from './types';

type AuthResponse = { user: User; tokens: AuthTokens };

async function persistAuth(data: AuthResponse) {
  await secureStorage.set(SecureKeys.ACCESS_TOKEN, data.tokens.accessToken);
  await secureStorage.set(SecureKeys.REFRESH_TOKEN, data.tokens.refreshToken);
  useAuthStore.getState().setUser(data.user);
}

export function useLoginMutation() {
  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const { data } = await apiClient.post<AuthResponse>('/auth/login', payload);
      return data;
    },
    onSuccess: persistAuth,
  });
}

export function useRegisterMutation() {
  return useMutation({
    mutationFn: async (payload: RegisterPayload) => {
      const { data } = await apiClient.post<AuthResponse>('/auth/register', payload);
      return data;
    },
    onSuccess: persistAuth,
  });
}

export async function logout() {
  await secureStorage.remove(SecureKeys.ACCESS_TOKEN);
  await secureStorage.remove(SecureKeys.REFRESH_TOKEN);
  useAuthStore.getState().reset();
}
