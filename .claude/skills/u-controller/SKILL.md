---
name: u-controller
description: 'Feature-local Zustand stores — *-store.ts in src/features/<f>/. UI state, form drafts, ephemeral filter selections. Triggers — controller, store, zustand, feature store, *-store.ts, local state, ui state, draft, filter state, selector.'
---

# u-controller — Feature Zustand Store

## TL;DR

- One store per feature: `src/features/<f>/<f>-store.ts` — Zustand 5
- Store HOLDS: UI state (filters, selected tab, draft form), NOT server data — server data is TanStack Query's job
- Read with selector: `const filter = useOrdersStore((s) => s.filter)` — never `const s = useOrdersStore()`
- Actions live inside the create function: `setFilter`, `reset`
- For shallow object reads: `useOrdersStore(useShallow((s) => ({ a: s.a, b: s.b })))`

## When to load

Adding/editing a `*-store.ts`, fixing rerender issues, deciding "store this state where", choosing between local `useState` and Zustand.

---

## Decision: store this state WHERE?

| State kind                                         | Where                                                        |
| -------------------------------------------------- | ------------------------------------------------------------ |
| Server data (orders, user profile)                 | TanStack Query (`u-usecase`)                                 |
| Auth, theme, connectivity (app-wide)               | Global Zustand under `src/lib/<concern>/` (`u-global-store`) |
| Filter selections, sort, current tab (per feature) | Feature `*-store.ts` (this skill)                            |
| Modal open/closed (one screen)                     | `useState` in that screen                                    |
| Form field values                                  | `react-hook-form` (`u-form`)                                 |

If state is consumed by ≥2 components in the same feature → feature store. If ≥2 features → global store. If 1 component only → `useState`.

---

## Shape

```ts
// src/features/orders/orders-store.ts
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

export type OrderFilter = 'all' | 'pending' | 'cancelled';

interface OrdersState {
  filter: OrderFilter;
  selectedIds: string[];
}

interface OrdersActions {
  setFilter: (f: OrderFilter) => void;
  toggleSelect: (id: string) => void;
  reset: () => void;
}

const initial: OrdersState = { filter: 'all', selectedIds: [] };

export const useOrdersStore = create<OrdersState & OrdersActions>((set) => ({
  ...initial,
  setFilter: (filter) => set({ filter }),
  toggleSelect: (id) =>
    set((s) => ({
      selectedIds: s.selectedIds.includes(id)
        ? s.selectedIds.filter((x) => x !== id)
        : [...s.selectedIds, id],
    })),
  reset: () => set(initial),
}));

export const useOrdersFilter = () => useOrdersStore((s) => s.filter);
export const useOrdersSelected = () => useOrdersStore(useShallow((s) => s.selectedIds));
```

**Co-locate selector hooks** in the same file — components import `useOrdersFilter` not the raw store.

---

## Reading

```tsx
// ✅ Single field
const filter = useOrdersStore((s) => s.filter);

// ✅ Multiple fields — useShallow prevents rerender on unrelated key changes
const { filter, selectedIds } = useOrdersStore(
  useShallow((s) => ({ filter: s.filter, selectedIds: s.selectedIds })),
);

// ❌ Returns whole store — rerenders on every change
const store = useOrdersStore();
```

## Writing

```tsx
// ✅ Pull action separately — actions never change identity
const setFilter = useOrdersStore((s) => s.setFilter);
return <Button onPress={() => setFilter('pending')}>Pending</Button>;
```

---

## Reset on screen unmount (when needed)

```tsx
useEffect(() => {
  return () => useOrdersStore.getState().reset();
}, []);
```

`getState()` is the non-reactive accessor — use it inside effects/handlers, never inside render.

---

## Persisting feature state (rare)

Most feature state should NOT persist. If a filter MUST survive backgrounding:

```ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvJSONStorage } from '@/lib/storage/mmkv';

export const useOrdersStore = create<OrdersState & OrdersActions>()(
  persist((set) => ({ ...initial /* actions */ }), {
    name: 'orders-store',
    storage: createJSONStorage(() => mmkvJSONStorage),
    partialize: (s) => ({ filter: s.filter }), // never persist selectedIds
    version: 1,
  }),
);
```

See `u-storage` for `mmkvJSONStorage` adapter, `u-global-store` for migrate/version.

---

## Do / Don't

| ✅                           | ❌                                              |
| ---------------------------- | ----------------------------------------------- |
| One store per feature        | One mega-store for the app                      |
| Selector for every read      | Subscribe to whole store                        |
| `useShallow` for multi-field | Object literal in selector without `useShallow` |
| Pull actions separately      | Re-create handler with whole store              |
| Server data → TanStack       | Server data in Zustand                          |
| `getState()` in effects      | `useStore` in non-component code                |

---

## Common pitfalls

- **Re-rendering everywhere**: caused by returning a new object from selector without `useShallow`. Fix: split selectors or wrap with `useShallow`.
- **Stale closures in handlers**: caused by reading store via `useStore` then closing over it. Fix: read via `getState()` inside the callback.
- **State leaks across users**: feature store survives logout. Fix: add `reset()` action and call from auth store on sign-out.

---

## Testing

```ts
import { act, renderHook } from '@testing-library/react-native';

beforeEach(() => useOrdersStore.getState().reset());

it('toggleSelect adds and removes ids', () => {
  const { result } = renderHook(() => useOrdersStore());
  act(() => result.current.toggleSelect('a'));
  expect(result.current.selectedIds).toEqual(['a']);
  act(() => result.current.toggleSelect('a'));
  expect(result.current.selectedIds).toEqual([]);
});
```

---

## See also

- `u-architecture` — feature module layout
- `u-global-store` — app-wide stores (auth/theme/connectivity)
- `u-reactive-state` — when to choose Zustand vs `useState` vs TanStack
- `u-storage` — MMKV adapter for persist
- `u-usecase` — server data lives in TanStack, NOT here
