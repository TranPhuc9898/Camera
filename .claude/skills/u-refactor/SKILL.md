---
name: u-refactor
description: 'Safe refactor patterns for the unicorn RN stack — extract component, split store, rename type, move file with import-alias updates, lift state. Triggers — refactor, extract, split, rename, move file, lift state, restructure, reorganize, clean up, codemod.'
---

# u-refactor — Safe Refactors

## TL;DR

- Refactor in small, behavior-preserving steps — each commit compiles + tests pass
- Use TS rename (LSP `F2`) for symbols; never sed-replace identifiers
- Path aliases `@/...` survive moves — prefer them over relative imports for cross-feature
- Component extract: pull JSX into a named component before adding props or hooks to it
- Store split: when a Zustand store grows beyond ~150 lines or 2 concerns → split, never branch by `if (mode)`
- Always type-check + lint after each step: `npm run typecheck && npm run lint`

## When to load

Asked to "refactor", "clean up", "split", "extract"; a file/store crossed a size threshold; a feature gained a second responsibility.

---

## Refactor catalog

| Refactor              | Trigger                                   | Risk   | Tooling                                 |
| --------------------- | ----------------------------------------- | ------ | --------------------------------------- |
| Extract component     | JSX block > 40 lines or repeated 2+ times | Low    | Manual                                  |
| Extract hook          | Logic block reused in 2+ components       | Low    | Manual                                  |
| Split Zustand store   | Store > 150 lines or 2 unrelated concerns | Medium | Manual + grep callers                   |
| Rename symbol         | Misleading or inconsistent name           | Low    | LSP rename (F2)                         |
| Move file             | Folder grew unfocused                     | Medium | LSP move OR manual + import-alias check |
| Lift state            | 2+ siblings need same state               | Low    | Manual                                  |
| Inline                | One-line abstraction with one caller      | Low    | Manual                                  |
| Replace prop drilling | 3+ levels of pass-through                 | Medium | Context OR Zustand store                |

---

## Extract component

```tsx
// Before — everything inline
function OrderRow({ order }: Props) {
  return (
    <View className="flex-row items-center gap-sm p-md">
      <View className="bg-surface-elevated size-10 items-center justify-center rounded-full">
        <Text className="text-text-primary font-semibold">{order.code[0]}</Text>
      </View>
      <View className="flex-1">
        <Text>{order.code}</Text>
        <Text className="text-text-secondary text-sm">{order.status}</Text>
      </View>
    </View>
  );
}

// After — named, reusable, testable
function OrderAvatar({ code }: { code: string }) {
  return (
    <View className="bg-surface-elevated size-10 items-center justify-center rounded-full">
      <Text className="text-text-primary font-semibold">{code[0]}</Text>
    </View>
  );
}

function OrderRow({ order }: Props) {
  return (
    <View className="flex-row items-center gap-sm p-md">
      <OrderAvatar code={order.code} />
      <View className="flex-1">
        <Text>{order.code}</Text>
        <Text className="text-text-secondary text-sm">{order.status}</Text>
      </View>
    </View>
  );
}
```

**Rule:** name the new component for what it IS, not for what it's used by (`OrderAvatar`, not `OrderRowLeftIcon`).

---

## Extract hook

```tsx
// Before — duplicated in 2 screens
const { data, isLoading, refetch } = useGetOrders(filter);
useFocusEffect(
  useCallback(() => {
    refetch();
  }, [refetch]),
);

// After — single source of truth
function useOrdersOnFocus(filter: Filter) {
  const q = useGetOrders(filter);
  useFocusEffect(
    useCallback(() => {
      q.refetch();
    }, [q.refetch]),
  );
  return q;
}
```

File: `src/features/orders/hooks/use-orders-on-focus.ts`

---

## Split a Zustand store

```ts
// Before — single bloated store
type State = {
  // filters (orders)
  filter: Filter;
  setFilter(f: Filter): void;
  // drafts (compose)
  draft: Draft;
  setDraft(d: Draft): void;
  resetDraft(): void;
  // recent searches
  searches: string[];
  pushSearch(s: string): void;
};
```

→ Split into 3 stores per concern, each its own file:

```
src/features/orders/store/
  filter-store.ts
  draft-store.ts
  search-history-store.ts
```

**Steps:**

1. Create new store files, copy slice
2. Update callers (grep `useOrdersStore` to find them)
3. Delete old store ONLY after callers migrated + typecheck passes
4. Commit per store, not all at once

---

## Rename symbol

Use LSP rename (`F2` in VS Code, equivalent in IDE) — it updates:

- Definition
- All imports
- All references
- Re-exports

Never use `sed -i` for identifier renames — collisions in strings, comments, partial matches.

For renaming a file's name: see "Move file" below.

---

## Move file

```bash
# Old path
src/features/orders/components/order-card.tsx

# New path (folder rename: components → ui)
src/features/orders/ui/order-card.tsx
```

**Steps:**

1. `git mv` the file (preserves history)
2. LSP move (if supported) OR manual update of imports
3. Grep verify: `rg "from '.*orders/components/order-card'"`
4. Path aliases (`@/features/orders/...`) make this cheap — prefer them

```ts
// ✅ Survives moves better
import { OrderCard } from '@/features/orders/ui/order-card';

// ❌ Breaks on parent rename
import { OrderCard } from '../../../features/orders/ui/order-card';
```

---

## Lift state

Two siblings need the same state → lift to closest common parent OR feature store.

```tsx
// Before — duplicated, drifts
function FilterBar() { const [open, setOpen] = useState(false); ... }
function FilterSheet() { const [open, setOpen] = useState(false); ... }

// After — lifted to feature store
const useFilterStore = create<{ open: boolean; toggle(): void }>((set) => ({
  open: false,
  toggle: () => set((s) => ({ open: !s.open })),
}))
```

Lift to **parent** for tight coupling (sheet inside one screen); lift to **store** for cross-screen.

---

## Replace prop drilling

```tsx
// 3+ levels passing the same prop
<Screen user={user}>
  <Header user={user}>
    <Avatar user={user} />
  </Header>
</Screen>
```

→ Move to `useAuthStore` (cross-feature) OR React Context (component-tree-local).

**Decision:**

- App-wide identity → Zustand store
- Tree-scoped (form context, theme) → Context

---

## Refactor sequence rules

1. **One refactor per commit** — bisect-friendly
2. **Tests first** if there's coverage; refactor under green
3. **Type-check after every step** — TS catches 80% of breakage
4. **Lint** — catches unused imports left over from moves
5. **Run the app** — TS + lint don't catch runtime regressions (provider missing, hook ordering)

---

## Codemod when manual is too risky

For 20+ call-site changes, write a tiny ts-morph script:

```ts
import { Project } from 'ts-morph';
const p = new Project({ tsConfigFilePath: 'tsconfig.json' });
p.getSourceFiles().forEach((f) => {
  f.getImportDeclarations()
    .filter((i) => i.getModuleSpecifierValue() === '@/lib/old')
    .forEach((i) => i.setModuleSpecifier('@/lib/new'));
});
p.save();
```

Run, verify diff, commit codemod separately from manual edits.

---

## Do / Don't

| ✅                                     | ❌                                    |
| -------------------------------------- | ------------------------------------- |
| Small steps, each commit green         | "Big bang" rename branch              |
| LSP rename for symbols                 | `sed -i` for identifiers              |
| Path aliases for cross-feature imports | Deep relative paths                   |
| Type-check + lint after each step      | Refactor blind, fix at the end        |
| Move via `git mv`                      | Delete + create (loses history)       |
| Test before behavioral changes         | Refactor + add feature in same commit |

---

## Common pitfalls

- **Circular imports after split**: A imports B, B imports A. Extract shared piece into C.
- **Prop drilling solved with global state**: don't reach for Zustand if it's truly tree-local — use Context.
- **Premature extraction**: 1 caller doesn't justify a hook. Wait for the second use.
- **Renamed file but kept old export name**: confusing. Rename both.
- **Refactor + behavior change in same PR**: hides regressions in the diff. Split.

---

## See also

- `u-architecture` — boundary rules a refactor must respect
- `u-controller` — Zustand store split patterns
- `u-finalize` — typecheck/lint gate before commit
- `u-testing` — keep tests green during refactor
