---
name: u-usecase
description: 'Use-case hooks (domain layer) — TanStack Query v5 wrappers over feature api.ts. useQuery / useMutation / useInfiniteQuery patterns, query-key factory, invalidation, optimistic updates. Triggers — use case, useQuery, useMutation, useInfiniteQuery, query key, invalidate, refetch, mutation, optimistic update, hook, domain layer.'
---

# u-usecase — Domain Layer Hooks for unicorn

## TL;DR

- Use-case = a hook in `src/features/<f>/use-cases/use-<verb>-<entity>.ts` that wraps TanStack `useQuery` / `useMutation` over a function in `api.ts`
- Naming: `useGetOrders` (query), `useUpdateOrder` (mutation), `useOrdersInfinite` (infinite)
- Every feature has ONE `*-keys.ts` factory file — single source of truth for query keys
- Mutations invalidate via `queryClient.invalidateQueries({ queryKey: keys.list() })` in `onSuccess`
- Hooks are the ONLY thing screens import for server data — no `axios`, no `api.ts` imports in screens

## When to load

Adding/editing a `use-*-query.ts` / `use-*-mutation.ts`, designing query keys, fixing a stale-data bug, choosing between `useQuery` / `useMutation` / `useInfiniteQuery`, or wiring optimistic updates.

---

## Files for one feature

```
src/features/orders/
  api.ts                         ← getOrders, updateOrder (see u-api)
  orders-types.ts
  use-cases/
    orders-keys.ts               ← query key factory
    use-get-orders.ts            ← useQuery
    use-get-order.ts             ← useQuery (single)
    use-orders-infinite.ts       ← useInfiniteQuery
    use-update-order.ts          ← useMutation
    use-cancel-order.ts          ← useMutation
```

---

## Query-key factory

```ts
// src/features/orders/use-cases/orders-keys.ts
import type { OrderListParams } from '../orders-types';

export const ordersKeys = {
  all: ['orders'] as const,
  lists: () => [...ordersKeys.all, 'list'] as const,
  list: (params: OrderListParams) => [...ordersKeys.lists(), params] as const,
  details: () => [...ordersKeys.all, 'detail'] as const,
  detail: (id: string) => [...ordersKeys.details(), id] as const,
};
```

**Why a factory?** Mutations invalidate by prefix (`ordersKeys.lists()` matches every list variant). Without a factory you end up with duplicate string keys and stale data bugs.

---

## `useQuery` — list / detail

```ts
// src/features/orders/use-cases/use-get-orders.ts
import { useQuery } from '@tanstack/react-query';
import { getOrders } from '../api';
import type { OrderListParams } from '../orders-types';
import { ordersKeys } from './orders-keys';

export function useGetOrders(params: OrderListParams) {
  return useQuery({
    queryKey: ordersKeys.list(params),
    queryFn: () => getOrders(params),
    staleTime: 30_000,
    enabled: !!params.userId,
  });
}
```

**Defaults to set per query:**

- `staleTime`: how long data is "fresh" — 30s for lists, 5min for static lookups
- `enabled`: gate on dependencies (don't fire until `userId` exists)
- `retry`: leave default (3); override to `false` for non-idempotent mutations only

---

## `useMutation` — write op

```ts
// src/features/orders/use-cases/use-update-order.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateOrder } from '../api';
import type { Order } from '../orders-types';
import { ordersKeys } from './orders-keys';

export function useUpdateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; patch: Partial<Order> }) => updateOrder(vars.id, vars.patch),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ordersKeys.lists() });
      qc.setQueryData(ordersKeys.detail(updated.id), updated);
    },
  });
}
```

**Rule:** every mutation invalidates the matching `keys.lists()` and sets the detail cache directly when you have the response.

---

## `useInfiniteQuery` — paginated lists

```ts
// src/features/orders/use-cases/use-orders-infinite.ts
import { useInfiniteQuery } from '@tanstack/react-query';
import { getOrders } from '../api';
import { ordersKeys } from './orders-keys';

export function useOrdersInfinite() {
  return useInfiniteQuery({
    queryKey: ordersKeys.lists(),
    queryFn: ({ pageParam }) => getOrders({ cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor,
  });
}
```

Use with FlashList's `onEndReached={() => fetchNextPage()}`.

---

## Optimistic update (only when needed)

```ts
useMutation({
  mutationFn: cancelOrder,
  onMutate: async (id) => {
    await qc.cancelQueries({ queryKey: ordersKeys.detail(id) });
    const prev = qc.getQueryData<Order>(ordersKeys.detail(id));
    qc.setQueryData<Order>(ordersKeys.detail(id), (old) =>
      old ? { ...old, status: 'cancelled' } : old,
    );
    return { prev };
  },
  onError: (_err, id, ctx) => {
    if (ctx?.prev) qc.setQueryData(ordersKeys.detail(id), ctx.prev);
  },
  onSettled: (_d, _e, id) => {
    qc.invalidateQueries({ queryKey: ordersKeys.detail(id) });
  },
});
```

Only use optimistic when the success path is dominant AND the rollback is cheap.

---

## Screen consumption pattern

```tsx
const { data: orders = [], isLoading, error } = useGetOrders({ userId });
const { mutate: cancel, isPending } = useCancelOrder();

if (isLoading) return <ScreenLoader />;
if (error) return <ErrorState message={errorMessage(t, error)} />;
return <OrderList orders={orders} onCancel={(id) => cancel(id)} />;
```

Screens never see `axios`, never see promises directly — they consume hook return state.

---

## Decision matrix

| Need                           | Hook                          |
| ------------------------------ | ----------------------------- |
| Read once, refresh on focus    | `useQuery`                    |
| Read paginated/scrollable list | `useInfiniteQuery`            |
| Write op                       | `useMutation`                 |
| Multiple parallel reads        | `useQueries`                  |
| Read derived from query        | `select` option of `useQuery` |
| Read needed conditionally      | `useQuery` + `enabled`        |

---

## Do / Don't

| ✅                                       | ❌                                     |
| ---------------------------------------- | -------------------------------------- |
| Use the `*-keys.ts` factory              | Hard-code `['orders', 'list']` strings |
| Invalidate `keys.lists()` after mutation | Refetch a single hook by re-mounting   |
| `enabled: !!param` for gating            | `if (!param) return null` before hook  |
| Throw `AppError` from `api.ts`           | Throw `AxiosError` to hook             |
| `select` for derived data                | New hook for projection                |

---

## Testing

```ts
import { renderHook, waitFor } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
const wrapper = ({ children }) => (
  <QueryClientProvider client={qc}>{children}</QueryClientProvider>
)

const { result } = renderHook(() => useGetOrders({ userId: '1' }), { wrapper })
await waitFor(() => expect(result.current.isSuccess).toBe(true))
```

Mock `api.ts` module — never axios directly.

---

## See also

- `u-api` — `getOrders` lives here
- `u-architecture` — layer rules (hooks ONLY in screens)
- `u-controller` — feature Zustand store (UI state, not server data)
- `u-error-handling` — `errorMessage(t, err)` for surfacing query errors
- `u-testing` — RTL + QueryClientProvider patterns
