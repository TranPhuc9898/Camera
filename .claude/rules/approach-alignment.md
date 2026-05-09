---
paths:
  - 'src/**/*.ts'
  - 'src/**/*.tsx'
  - 'app/**/*.tsx'
---

# Approach Alignment — Pre-Implementation Checklist

Use this **before writing code** (during planning) AND **before finalizing** (during review).

Severity: a smell that **causes incorrect behaviour or desynced state** = 🔴 BLOCKER. A smell that is purely stylistic but works correctly = 🟡 warning.

---

## §A — Approach Smells

```
State as multiple booleans?
  · isLoading + hasData + hasError = 3 bools for 1 concern
  → Use TanStack useQuery — carries data + status + error in one object

Boolean flag parameter that changes hook/method behaviour?
  · loadItems({forceRefresh = false})
  → Two hooks: useItemsQuery() and a manual refetch() returned by it
    OR call queryClient.invalidateQueries({queryKey: ['items']}) for explicit refresh

Nested conditions > 2 levels?
  → Guard clauses: if (isLoading || !input || !isValid) return;

Multiple Zustand fields for one conceptual state?
  · items: [] + loadingItems: false in same store, fed by an API call
  → Move server data to TanStack useQuery; keep only UI state in Zustand

Flag-driven control flow across functions?
  · _hasInitialized — read in submit() to guard against missing init()
  → Express structurally with a state-machine enum or split into two screens

Long if/else chains for enum-like values?
  → Use a switch + exhaustive type check (TS `never` exhaustiveness)
```

---

## §B — Layer Contracts (non-negotiable)

```
Screen / Component access:
  ✅ useFooQuery() / useFooMutation() / useFooStore()
  ❌ direct fooApi.method() call from a component
  ❌ direct axios.get(...) from a component

Use case hook (useFooQuery / useFooMutation):
  ✅ fooApi.method(...) — feature api module
  ❌ another use-case hook called inside (compose at the screen layer)
  ❌ direct apiClient.get(...) — go through the typed api module

Feature api module (features/<f>/api.ts):
  ✅ apiClient.get/post/put/delete<T>(url, ...)
  ✅ storage.set/getString/.../remove for persisted reads
  ❌ depends on a Zustand store (api modules are pure functions)

Zustand store:
  ✅ pure UI state + actions (set/get)
  ❌ HTTP calls inside actions — call api modules from the screen, set the result via action
  ❌ subscribe to React lifecycles (no useEffect inside store)
```

---

## §C — Reactive State Patterns (RN/TanStack/Zustand)

```
Server data (no user action, no user-facing error):
  ✅ const { data, isLoading } = useFooQuery(params)
  ❌ useState + useEffect + axios — reinventing TanStack

User action (needs error UI + side effects):
  ✅ const m = useFooMutation();
     try { await m.mutateAsync(req); toast.success(...) }
     catch (e) { logger.error('[X] failed', e); toast.error(...) }
  ❌ Plain async function in component — loses retry, dedupe, optimistic update

Computed derived state from a store:
  ✅ const filtered = useStore(s => s.items.filter(pred))   // Zustand selector
  ✅ const filtered = useMemo(() => items.filter(pred), [items, pred])
  ❌ recomputing inside JSX without memo for non-trivial lists

Selector scope:
  ✅ Subscribe to ONLY the slice you need: useStore(s => s.theme)
  ❌ const state = useStore() — re-renders on every change

Disposal:
  ✅ AbortController / unsubscribe / clearInterval inside useEffect cleanup
  ❌ Any subscription created in useEffect without a cleanup return

Persisted state:
  ✅ Zustand persist middleware with MMKV adapter, name: StorageKeys.XXX
  ❌ Manually calling storage.set after every mutation
```

---

## §D — Extend vs Create

Before creating a new file, answer:

```
Existing api module already owns this data?
  · grep the entity type in src/features/**/api.ts
  → yes: add a function — do NOT create a parallel api module

Existing use-case hook covers ≥ 80% of the need?
  → yes: extend params or compose — do NOT create a duplicate hook

Adding state to an existing store is cleaner?
  → yes: add the field — do NOT spin up a new store

Existing reusable component in src/components/{ui,shared}/?
  · grep -rn 'export.*const.*Component' src/components/
  → yes: import it — do NOT build an inline one-off

Existing util / hook in src/lib/hooks/ or src/utils/?
  → yes: import it — do NOT rewrite
```

> One unnecessary new file = scope creep. Two = overengineering.

---

## Quick Verdict

```
Server data via useQuery (not useState+useEffect)?            [yes / fix: ___]
No flag parameters on hooks?                                   [yes / fix: ___]
Components only call hooks — never api modules directly?       [yes / fix: ___]
Mutations use try/catch + toast/log on error?                  [yes / fix: ___]
Zustand selectors subscribe to minimal slice?                  [yes / fix: ___]
Effects clean up subscriptions / AbortController?              [yes / fix: ___]
New file actually needed (not an extension of existing)?       [yes / fix: ___]
```

If any answer is "fix" — revise the plan before writing a single line of code.
