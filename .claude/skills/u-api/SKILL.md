---
name: u-api
description: 'Data-layer API conventions for unicorn — axios client, interceptors, BaseResponse mapping, AppError classification, request/response logging. Triggers — api.ts, axios, interceptor, BaseResponse, error mapping, retry, refresh token, network call, http, endpoint, request, response, AxiosError.'
---

# u-api — Data Layer (axios) for unicorn

## TL;DR

- ALL HTTP goes through `src/lib/api/client.ts` (single axios instance) — no `fetch`, no scattered `axios.create`
- Three interceptors: **auth** (attach token) → **refresh** (401 retry once) → **logger** (`log.info`)
- Feature `api.ts` exports plain async functions: `getOrders(params)`, `updateOrder(id, body)` — call them from use-case hooks ONLY
- Map every response to a domain shape — never leak `BaseResponse<T>` upward
- All thrown errors must be `AppError` (use `u-error-handling`)

## When to load

Touching `src/lib/api/client.ts`, adding/editing a feature `api.ts`, debugging interceptor order, mapping a BE response, or wiring a refresh-token flow.

---

## File layout

```
src/lib/api/
  client.ts            ← single axios instance + interceptors
  query-provider.tsx   ← TanStack QueryClient wrapper (used in app/_layout.tsx)
  base-response.ts     ← envelope type if BE wraps payload
  endpoints.ts         ← shared endpoint constants (optional)
src/features/<f>/
  api.ts               ← feature endpoint functions, mapping, types co-located
```

---

## `client.ts` shape

```ts
import axios, { AxiosError, type AxiosInstance } from 'axios';
import { ENV } from '@/config/env';
import { log } from '@/lib/logger';
import { secureStorage, SECURE_KEYS } from '@/lib/auth/secure-storage';
import { AppError, AppErrorCode } from '@/lib/error';

export const api: AxiosInstance = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: 15_000,
});

// 1. auth interceptor
api.interceptors.request.use(async (cfg) => {
  const token = await secureStorage.get(SECURE_KEYS.accessToken);
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// 2. refresh interceptor (401 → refresh once → retry)
let refreshing: Promise<string | null> | null = null;
api.interceptors.response.use(
  (r) => r,
  async (err: AxiosError) => {
    const original = err.config as (typeof err.config & { _retry?: boolean }) | undefined;
    if (err.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      refreshing ??= refreshAccessToken();
      const next = await refreshing;
      refreshing = null;
      if (next) {
        original.headers ??= {};
        original.headers.Authorization = `Bearer ${next}`;
        return api.request(original);
      }
    }
    throw mapAxiosError(err);
  },
);

// 3. logger interceptor — last, so retried requests are logged once
api.interceptors.request.use((cfg) => {
  log.info(`[api] → ${cfg.method?.toUpperCase()} ${cfg.url}`);
  return cfg;
});
api.interceptors.response.use(
  (r) => {
    log.info(`[api] ← ${r.status} ${r.config.url}`);
    return r;
  },
  (err: AxiosError) => {
    log.warning(`[api] ✗ ${err.response?.status ?? '???'} ${err.config?.url}`);
    throw err;
  },
);
```

**Order matters.** auth → refresh → logger ensures logger sees the final (retried) request once and the final status.

---

## Feature `api.ts` template

```ts
// src/features/orders/api.ts
import { api } from '@/lib/api/client';
import type { Order, OrderListParams, OrderDto } from './orders-types';

const ENDPOINT = '/orders';

export async function getOrders(params: OrderListParams): Promise<Order[]> {
  const res = await api.get<{ data: OrderDto[] }>(ENDPOINT, { params });
  return res.data.data.map(toOrder);
}

export async function updateOrder(id: string, patch: Partial<Order>): Promise<Order> {
  const res = await api.patch<{ data: OrderDto }>(`${ENDPOINT}/${id}`, patch);
  return toOrder(res.data.data);
}

function toOrder(dto: OrderDto): Order {
  return { id: dto.id, total: dto.total_amount / 100, status: dto.status };
}
```

**Rules:**

- Function name = verb + entity (`getOrders`, `cancelOrder`, `searchOrders`)
- Return domain shape, NEVER `BaseResponse<T>` or raw DTO
- Mapping function lives at bottom of `api.ts` — keep DTO type private to this file
- Throw nothing manually — interceptor already converts AxiosError to AppError

---

## BaseResponse handling

If BE wraps everything as `{ code, message, data }`:

```ts
// src/lib/api/base-response.ts
export type BaseResponse<T> = { code: number; message: string; data: T };

export function unwrap<T>(res: { data: BaseResponse<T> }): T {
  if (res.data.code !== 0) throw new AppError(AppErrorCode.Server, res.data.message);
  return res.data.data;
}
```

Use in feature `api.ts`:

```ts
const res = await api.get<BaseResponse<OrderDto[]>>(ENDPOINT);
return unwrap(res).map(toOrder);
```

---

## Error mapping (axios → AppError)

```ts
// src/lib/api/map-error.ts
export function mapAxiosError(err: AxiosError): AppError {
  if (!err.response) return new AppError(AppErrorCode.Network, 'No connection');
  const { status, data } = err.response;
  if (status === 401) return new AppError(AppErrorCode.Unauthorized, 'Session expired');
  if (status === 403) return new AppError(AppErrorCode.Forbidden, 'Access denied');
  if (status >= 500) return new AppError(AppErrorCode.Server, 'Server error');
  const msg = (data as { message?: string })?.message ?? 'Request failed';
  return new AppError(AppErrorCode.Validation, msg, { cause: err });
}
```

Hooks/screens then use `errorMessage(t, err)` from `@/lib/i18n` to surface the i18n string. See `u-error-handling`.

---

## Refresh token

```ts
async function refreshAccessToken(): Promise<string | null> {
  const refresh = await secureStorage.get(SECURE_KEYS.refreshToken);
  if (!refresh) return null;
  try {
    const res = await axios.post(`${ENV.API_BASE_URL}/auth/refresh`, { refresh });
    const token = res.data.access_token as string;
    await secureStorage.set(SECURE_KEYS.accessToken, token);
    return token;
  } catch {
    await secureStorage.clear();
    return null;
  }
}
```

Use a **separate axios instance** (not `api`) for refresh to avoid recursion through interceptors.

---

## Do / Don't

| ✅                                          | ❌                              |
| ------------------------------------------- | ------------------------------- |
| Import `api` from `@/lib/api/client`        | `axios.create` per feature      |
| Throw `AppError` from interceptor           | Throw raw `AxiosError` to UI    |
| Return mapped domain types                  | Return DTO / `BaseResponse<T>`  |
| Single `refreshing` promise gate            | Per-request refresh (race)      |
| Use TanStack `useQuery` to call `getOrders` | Call `getOrders` in `useEffect` |

---

## Check before finishing

```bash
grep -rn "axios\." src/features    # must be empty — only client.ts uses axios directly
grep -rn "fetch(" src/features     # must be empty
grep -rn "BaseResponse" src/features/*/screens   # must be empty — never leak to presentation
```

---

## See also

- `u-architecture` — layer rules (api.ts must not be imported by screens)
- `u-usecase` — wraps `getX` / `updateX` in TanStack hooks
- `u-error-handling` — `AppError`, `AppErrorCode`, `errorMessage(t, err)`
- `u-storage` — `expo-secure-store` for tokens (NOT MMKV)
