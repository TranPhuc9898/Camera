---
name: u-reactive-state
description: 'Decision matrix for state shape — useState vs useReducer vs Zustand selectors vs TanStack Query. When to derive, when to memo, when to lift. Triggers — where to put state, useState or zustand, server vs client state, derived state, memo, useReducer, lift state up, prop drilling.'
---

# u-reactive-state — State Decision Matrix

## TL;DR

| State kind                          | Tool                                                                   |
| ----------------------------------- | ---------------------------------------------------------------------- |
| Server data (anything from BE)      | TanStack `useQuery` / `useMutation`                                    |
| Form fields                         | `react-hook-form` + zod                                                |
| App-wide (auth/theme/connectivity)  | Global Zustand under `src/lib/<concern>/`                              |
| Per-feature (filters, selected tab) | Feature `*-store.ts`                                                   |
| Per-screen UI flag (modal open)     | `useState`                                                             |
| Complex local transitions           | `useReducer`                                                           |
| Derived value                       | inline expression OR `select` (TanStack) OR `useMemo` (expensive only) |

The cost of choosing wrong = stale data bugs, rerender storms, prop drilling. Choose by ANSWER, not habit.

## When to load

You're about to add `useState`, a new store, or a `useEffect` that fetches — pause and check the matrix here.

---

## Decision tree

```
Is the data from the backend?
├─ YES → TanStack useQuery / useMutation (u-usecase). DONE.
└─ NO ↓

Is it form input being typed?
├─ YES → react-hook-form (u-form). DONE.
└─ NO ↓

Is it shared by ≥ 2 features?
├─ YES → Global Zustand under src/lib/<concern>/ (u-global-store). DONE.
└─ NO ↓

Is it shared by ≥ 2 components in the SAME feature?
├─ YES → Feature *-store.ts (u-controller). DONE.
└─ NO ↓

Is it derived from existing state?
├─ YES → inline expression (cheap) or useMemo (>1ms). NOT a new state.
└─ NO ↓

Does updating it require multi-field transitions / discrete actions?
├─ YES → useReducer.
└─ NO  → useState.
```

---

## Common mistakes

### Server data in `useState`

```tsx
// ❌
const [orders, setOrders] = useState<Order[]>([]);
useEffect(() => {
  getOrders().then(setOrders);
}, []);

// ✅
const { data: orders = [] } = useGetOrders();
```

Loses retries, cache, dedupe, refetch-on-focus, stale time.

### Derived in `useState`

```tsx
// ❌ — fullName is state, but it's just first + last
const [fullName, setFullName] = useState('');
useEffect(() => setFullName(`${first} ${last}`), [first, last]);

// ✅
const fullName = `${first} ${last}`;
```

### Lifting too high

```tsx
// ❌ — modal flag in feature store, only one screen uses it
useOrdersStore((s) => s.isFilterModalOpen);

// ✅ — local
const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
```

### Pre-mature `useMemo`

```tsx
// ❌ — sorting 5 items is < 1µs; useMemo cost > computation cost
const sorted = useMemo(() => list.sort(), [list]);

// ✅ — inline
const sorted = [...list].sort();
```

Use `useMemo` only when (a) computation is genuinely expensive (>1ms), or (b) the value is a dependency of another `useMemo`/`useEffect` that needs referential stability.

---

## `useReducer` when

Component has ≥3 related fields that update together via discrete actions.

```ts
type State = { step: 'idle' | 'sending' | 'success' | 'error'; error?: string };
type Action =
  | { type: 'send' }
  | { type: 'sent' }
  | { type: 'fail'; error: string }
  | { type: 'reset' };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'send':
      return { step: 'sending' };
    case 'sent':
      return { step: 'success' };
    case 'fail':
      return { step: 'error', error: a.error };
    case 'reset':
      return { step: 'idle' };
  }
}

const [state, dispatch] = useReducer(reducer, { step: 'idle' });
```

If you find yourself writing >5 `useState` calls that update together → switch to reducer.

---

## TanStack `select` for derived server data

```tsx
const totalCount = useGetOrders(params, {
  select: (orders) => orders.length,
});
```

Component re-renders ONLY when `totalCount` changes, not when other order fields change. No client-side state needed.

---

## Zustand `useShallow` for multi-field reads

```tsx
import { useShallow } from 'zustand/react/shallow';

const { filter, sort } = useOrdersStore(useShallow((s) => ({ filter: s.filter, sort: s.sort })));
```

Without `useShallow`: rerenders on EVERY store change. With: only when `filter` or `sort` change.

---

## Render budget heuristic

Before adding state, ask: **what triggers a rerender of this component?**

If the answer is "any keystroke" or "every poll" — you've put the state too high. Push it down (lift down) until only the component that needs it owns it.

---

## Do / Don't

| ✅                                      | ❌                                     |
| --------------------------------------- | -------------------------------------- |
| TanStack for server data                | `useState` + `useEffect` fetch         |
| Derive inline                           | New state mirroring derivation         |
| `useMemo` only for expensive compute    | `useMemo` everything                   |
| Selector + `useShallow` for multi-field | Whole-store subscribe                  |
| `useReducer` for ≥3 related fields      | 5 separate `useState` updated together |

---

## See also

- `u-usecase` — TanStack hooks (server)
- `u-controller` — feature Zustand
- `u-global-store` — app-wide Zustand
- `u-form` — react-hook-form
- `u-performance` — measuring rerenders
