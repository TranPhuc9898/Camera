/**
 * Discriminated-union Result type for safe, explicit error handling.
 * Mirrors the Either/Result pattern from n_arch without class hierarchies.
 *
 * Usage:
 *   const res = await tryAsync(() => api.getUser(id));
 *   if (res.ok) doSomething(res.value);
 *   else handleError(res.error);
 */

export type Ok<T> = { ok: true; value: T };
export type Err<E = Error> = { ok: false; error: E };
export type Result<T, E = Error> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = <E = Error>(error: E): Err<E> => ({ ok: false, error });

export const tryAsync = async <T>(fn: () => Promise<T>): Promise<Result<T>> => {
  try {
    return ok(await fn());
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
};
