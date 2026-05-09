/**
 * Base store helpers for Zustand stores.
 * Mirrors n_arch BaseController pattern but TS-idiomatic (no classes).
 *
 * Canonical store template:
 * ─────────────────────────────────────────────
 * // --- State ---
 * type MyState = BaseStoreState & {
 *   items: Item[];
 * };
 *
 * // --- Selectors ---
 * export const selectItems = (s: MyState) => s.items;
 *
 * // --- Actions ---
 * type MyActions = {
 *   setItems: (items: Item[]) => void;
 * };
 *
 * // --- Persisted ---
 * export const useMyStore = create<MyState & MyActions>()(
 *   persist(
 *     (set, get) => ({
 *       ...createBaseStoreSlice(set),
 *       items: [],
 *       setItems: (items) => set({ items }),
 *     }),
 *     { name: StorageKeys.MY_KEY, storage: createJSONStorage(() => mmkvStorage) }
 *   )
 * );
 * ─────────────────────────────────────────────
 */

import type { StateCreator } from 'zustand';

// ── Common slice shared by all stores ──────────────────────────────────────

export type BaseStoreState = {
  /** True once the persisted store has been rehydrated from storage. */
  isHydrated: boolean;
  setHydrated: (v: boolean) => void;
  reset: () => void;
};

/**
 * Returns the common hydration/reset slice to spread into a store factory.
 * Callers supply `reset` to clear domain-specific state.
 *
 * @example
 * (set) => ({
 *   ...createBaseStoreSlice(set, () => set({ items: [] })),
 *   items: [],
 * })
 */
export function createBaseStoreSlice(
  set: (partial: Partial<BaseStoreState>) => void,
  resetFn?: () => void,
): BaseStoreState {
  return {
    isHydrated: false,
    setHydrated: (v: boolean) => set({ isHydrated: v }),
    reset: resetFn ?? (() => set({ isHydrated: false })),
  };
}

// ── Typed factory helper ────────────────────────────────────────────────────

/**
 * Convenience alias for Zustand's StateCreator — use this to type store
 * factory functions so the signature stays consistent across features.
 *
 * @example
 * const myStoreCreator: StoreCreator<MyState> = (set) => ({ ... });
 */
export type StoreCreator<T> = StateCreator<T, [], []>;
