/**
 * Type contract for feature API modules.
 * Mirrors the BaseRepository concept from n_arch but as a plain TS interface.
 *
 * Implementation convention:
 *   - Implement CrudApi<T> in `src/features/<feature>/api.ts`
 *   - Use it as the contract that TanStack Query mutation/query hooks call
 *
 * @example
 * // src/features/product/api.ts
 * import type { CrudApi } from '@/lib/arch';
 * import { apiClient } from '@/lib/api/client';
 * import type { Product } from './types';
 *
 * export const productApi: CrudApi<Product> = {
 *   list:   (p) => apiClient.get('/products', { params: p }).then(r => r.data),
 *   get:    (id) => apiClient.get(`/products/${id}`).then(r => r.data),
 *   create: (body) => apiClient.post('/products', body).then(r => r.data),
 *   update: (id, body) => apiClient.patch(`/products/${id}`, body).then(r => r.data),
 *   remove: (id) => apiClient.delete(`/products/${id}`).then(() => undefined),
 * };
 */

// ── Pagination ──────────────────────────────────────────────────────────────

export type ListParams = {
  page?: number;
  limit?: number;
  cursor?: string;
};

export type ListResponse<T> = {
  items: T[];
  nextCursor?: string;
  total?: number;
};

// ── CRUD contract ───────────────────────────────────────────────────────────

/**
 * Standard CRUD contract for a feature's API module.
 *
 * T       — the domain entity type
 * Create  — payload for POST (defaults to Partial<T>)
 * Update  — payload for PATCH (defaults to Partial<T>)
 *
 * Implement this in `src/features/<feature>/api.ts` and reference it from
 * usecase hooks so the data layer is swappable without touching query logic.
 */
export type CrudApi<T, Create = Partial<T>, Update = Partial<T>> = {
  list: (params?: ListParams) => Promise<ListResponse<T>>;
  get: (id: string) => Promise<T>;
  create: (input: Create) => Promise<T>;
  update: (id: string, input: Update) => Promise<T>;
  remove: (id: string) => Promise<void>;
};
