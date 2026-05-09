---
name: u-repository
description: 'Repository module — OPTIONAL layer between use-case hooks and api.ts when business logic, caching, or multi-source merging is needed. Triggers — repository, optional layer, business logic, multi-source, cache merge, transform layer, where to put logic.'
---

# u-repository — Optional Repository Layer

## TL;DR

- Repository is **optional** — most features go `screen → use-case → api.ts` directly
- Add a repository ONLY when ≥1 of: multi-source merging (api + storage), cross-feature business rules, complex DTO transformation, or auth/session-aware filtering
- Lives at `src/features/<f>/repository.ts`, exports a singleton via `getOrdersRepository()` factory
- Use-case hook becomes thin: `queryFn: () => repo.list(params)`
- Repository imports `api.ts`, `lib/storage`, `lib/auth` — never imports a hook or screen

## When to load

You catch yourself adding business logic into `api.ts` (mapping is fine; rules are not), or your `useGetX` hook is doing more than calling one api function.

---

## When repository helps

| Symptom                                           | Add repository?       |
| ------------------------------------------------- | --------------------- |
| `api.ts` has 200+ lines mixing endpoints + rules  | Yes                   |
| Hook merges remote + local cache before returning | Yes                   |
| Same business rule used in multiple use-cases     | Yes                   |
| One feature reads from 2 BE services              | Yes                   |
| Plain `getOrders` with one mapping                | No — keep in `api.ts` |

---

## Shape

```ts
// src/features/orders/orders-repository.ts
import { getOrders, updateOrder } from './api';
import { storage, StorageKeys } from '@/lib/storage/mmkv';
import type { Order, OrderListParams } from './orders-types';

export interface OrdersRepository {
  list(params: OrderListParams): Promise<Order[]>;
  cancel(id: string, reason: string): Promise<Order>;
  recents(): Order[]; // sync — local only
}

class OrdersRepositoryImpl implements OrdersRepository {
  async list(params: OrderListParams): Promise<Order[]> {
    const remote = await getOrders(params);
    const recentIds = this.recents().map((o) => o.id);
    return [...remote].sort(
      (a, b) => Number(recentIds.includes(b.id)) - Number(recentIds.includes(a.id)),
    );
  }

  async cancel(id: string, reason: string): Promise<Order> {
    if (reason.trim().length < 3) {
      throw new AppError(AppErrorCode.Validation, 'Reason too short');
    }
    const updated = await updateOrder(id, { status: 'cancelled', cancelReason: reason });
    this.pushRecent(updated);
    return updated;
  }

  recents(): Order[] {
    const raw = storage.getString(StorageKeys.recentOrders);
    return raw ? (JSON.parse(raw) as Order[]) : [];
  }

  private pushRecent(o: Order) {
    const list = [o, ...this.recents().filter((r) => r.id !== o.id)].slice(0, 10);
    storage.set(StorageKeys.recentOrders, JSON.stringify(list));
  }
}

let _instance: OrdersRepository | null = null;
export function getOrdersRepository(): OrdersRepository {
  return (_instance ??= new OrdersRepositoryImpl());
}
```

---

## Use-case becomes thin

```ts
// src/features/orders/use-cases/use-get-orders.ts
import { getOrdersRepository } from '../orders-repository';
import { ordersKeys } from './orders-keys';
import { useQuery } from '@tanstack/react-query';

export function useGetOrders(params: OrderListParams) {
  const repo = getOrdersRepository();
  return useQuery({
    queryKey: ordersKeys.list(params),
    queryFn: () => repo.list(params),
  });
}
```

---

## Testing

Repository is plain TS — no React, no QueryClient. Trivially unit-testable.

```ts
import { OrdersRepositoryImpl } from './orders-repository'
import * as api from './api'

jest.mock('./api')

it('sorts recents to the top', async () => {
  jest.spyOn(api, 'getOrders').mockResolvedValue([{ id: '1' } as Order, { id: '2' } as Order])
  const repo = new OrdersRepositoryImpl()
  // seed recent with id=2
  ...
})
```

---

## Do / Don't

| ✅                                      | ❌                                  |
| --------------------------------------- | ----------------------------------- |
| Add only when business logic is real    | Add for every feature out of habit  |
| Keep `api.ts` mapping-only              | Inline business rules into `api.ts` |
| Singleton via factory                   | Re-instantiate on every hook call   |
| Throw `AppError` from validation        | Return `null` for invalid input     |
| Sync read for cached data (`recents()`) | Wrap sync work in `Promise.resolve` |

---

## See also

- `u-api` — `api.ts` returns mapped domain shapes; repository consumes those
- `u-usecase` — hooks consume repository (when present)
- `u-storage` — MMKV reads/writes inside repository
- `u-architecture` — layer rules; repository sits between domain and data
