---
name: u-security
description: 'RN app security — token storage, transport, deep links, jailbreak/root, code obfuscation, input validation, dependency hygiene, secrets in app bundle. Triggers — security, secret, token, secure storage, OWASP MASVS, jailbreak, root, certificate pinning, deep link, app secrets, .env.'
---

# u-security — Mobile App Security

## TL;DR

- Tokens in `expo-secure-store` (Keychain / Keystore), NEVER MMKV / AsyncStorage
- HTTPS only — TLS 1.2+ enforced; certificate pinning for high-risk endpoints
- App secrets are NOT secret in a mobile bundle — assume reverse-engineered. Backend must be the trust boundary
- Deep links must validate the source — never trust query params for auth
- `.env*` files NEVER committed; secrets injected via EAS secrets / CI
- Input validation at the API boundary (zod schemas) — defense in depth, not just BE
- Audit dependencies quarterly: `npm audit`, supply-chain hygiene

## When to load

Adding auth/storage, accepting deep links, integrating new third-party SDK, pre-release security audit, handling regulated data (payments, PII).

---

## Threat model (start here)

| Threat                           | Mitigation                                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------- |
| Token theft from device storage  | `expo-secure-store` (Keychain/Keystore)                                                           |
| Token theft over network         | HTTPS + cert pinning for sensitive APIs                                                           |
| MitM on dev/staging              | HTTPS even in dev — no `http://` exemptions                                                       |
| Reverse-engineered API keys      | None for SECRET keys — they don't belong in the app. Public keys (Stripe pk\_, Sentry DSN) are OK |
| Deep link hijack (auth callback) | Validate origin, use state nonce, prefer Universal Links / App Links over custom scheme           |
| Jailbreak / root                 | Detect + degrade UX (block payments) — not a hard wall                                            |
| Tampered build                   | Code signing + integrity check on launch                                                          |
| PII in logs                      | Never log tokens/PII; Sentry beforeSend scrubs                                                    |

---

## Storage

```ts
// ✅ Tokens — secure storage
import * as SecureStore from 'expo-secure-store';

await SecureStore.setItemAsync('access_token', token, {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
});

// ❌ Tokens — MMKV (encryption is for at-rest, NOT replay-resistant; MMKV files are device-readable on backup)
storage.set('access_token', token);
```

| Data                           | Where                                                  |
| ------------------------------ | ------------------------------------------------------ |
| Access / refresh token         | `expo-secure-store`                                    |
| Biometric-gated session        | `expo-secure-store` with `requireAuthentication: true` |
| User preferences (theme, lang) | MMKV                                                   |
| Cached API responses           | MMKV (TanStack persist)                                |
| PII (email, phone, name)       | MMKV is acceptable; if regulated → SecureStore         |
| Card data                      | NEVER stored — pass to PCI-compliant SDK               |

---

## HTTPS + cert pinning

```ts
// app.config.ts — disable cleartext on Android
android: {
  config: { usesCleartextTraffic: false },
}
```

Cert pinning for high-risk endpoints (payments, auth) — use `react-native-cert-pinner` or hand-roll via SSL pinning lib. Pin to the public key, not full cert (rotation). Document expiry.

iOS App Transport Security (ATS) is on by default — keep all endpoints TLS 1.2+ HTTPS.

---

## Secrets in the app bundle

**Rule:** anything in `EXPO_PUBLIC_*`, `app.config.ts`, or imported from a JS file is **public**. Treat as such.

| Key type                           | Where                                   |
| ---------------------------------- | --------------------------------------- |
| Stripe publishable (`pk_*`)        | `EXPO_PUBLIC_STRIPE_KEY` — OK in bundle |
| Stripe secret (`sk_*`)             | NEVER in bundle — backend only          |
| Sentry DSN                         | `EXPO_PUBLIC_SENTRY_DSN` — OK           |
| Backend API key (server-to-server) | NEVER in bundle                         |
| OAuth client secret                | NEVER in bundle — use PKCE flow         |
| Map / Analytics public keys        | OK in bundle                            |

CI / build secrets: EAS secrets (`eas secret:create`) or repo secrets — never committed.

```bash
# .env.development         (gitignored)
EXPO_PUBLIC_API_URL=https://staging.api.unicorn.app

# .env.example             (committed)
EXPO_PUBLIC_API_URL=
```

`.gitignore`:

```
.env
.env.local
.env.development
.env.production
*.p8
*.p12
google-services.json
GoogleService-Info.plist
```

---

## Deep links

```ts
// app.config.ts
scheme: 'unicorn',
ios:     { associatedDomains: ['applinks:unicorn.app'] },
android: { intentFilters: [{ action: 'VIEW', data: [{ scheme: 'https', host: 'unicorn.app' }], category: ['BROWSABLE', 'DEFAULT'], autoVerify: true }] },
```

Prefer **Universal Links / App Links** (https://) over custom scheme (`unicorn://`) — verifiable, no hijack risk.

Auth callback validation:

```ts
// (app)/auth/callback.tsx
const { code, state } = useLocalSearchParams<{ code: string; state: string }>();
const expected = await SecureStore.getItemAsync('oauth_state');
if (state !== expected) throw new AppError({ code: AppErrorCode.invalidState });
```

Never auto-grant a session because a deep link arrived — verify state nonce + exchange code on backend.

---

## Input validation

```ts
// At the api boundary — defense in depth
const OrderSchema = z.object({
  id: z.string().uuid(),
  total: z.number().nonnegative(),
  status: z.enum(['pending', 'confirmed', 'cancelled']),
});

export async function getOrder(id: string): Promise<Order> {
  const res = await api.get(`/orders/${id}`);
  return OrderSchema.parse(res.data.data); // throws if BE drifts
}
```

Validation at the boundary catches BE schema drift, partial responses, MITM tampering.

---

## Logging hygiene

```ts
// ❌ Never
console.log('user logged in', { token, email, phone });

// ✅ Scrub before logging
log.info('user logged in', { userId: user.id });

// Sentry beforeSend scrubs known-sensitive keys
Sentry.init({
  beforeSend(event) {
    const data = event.extra ?? {};
    delete data.token;
    delete data.password;
    delete data.refreshToken;
    return event;
  },
});
```

PII rule: log **identifiers** (user id, order id), never **content** (email, phone, address, payment info).

---

## Jailbreak / root detection

```ts
// react-native-jail-monkey or similar
import JailMonkey from 'jail-monkey';

if (JailMonkey.isJailBroken()) {
  // Soft block: degrade payment / banking features, log
  log.warn('jailbroken_device_detected');
  setPaymentsAvailable(false);
}
```

Treat as **risk signal**, not a hard wall — false positives exist (custom ROMs, dev devices).

---

## Biometric gate

```ts
import * as LocalAuth from 'expo-local-authentication';

const result = await LocalAuth.authenticateAsync({
  promptMessage: t('auth.biometric-prompt'),
  fallbackLabel: t('auth.use-passcode'),
});
if (!result.success) throw new AppError({ code: AppErrorCode.biometricFailed });
```

Use for: re-auth on sensitive actions (transfer, settings export), unlocking saved tokens. Always offer passcode fallback.

---

## Dependency hygiene

```bash
npm audit --omit=dev
npm outdated
npx depcheck                         # unused deps
```

CI gate: fail PR if `npm audit --audit-level=high` reports anything new vs. main.

Quarterly: review `package.json` — remove unused, upgrade major versions one at a time.

Watch out for:

- Packages with < 100 weekly downloads added recently (typo-squatting)
- Packages with single maintainer for critical deps
- Postinstall scripts (`npm i --ignore-scripts` in CI for deterministic builds)

---

## Code obfuscation

JS bundle is readable after extraction. For sensitive logic:

- Keep on backend (preferred)
- Use Hermes (default in RN) — bytecode is harder than minified JS but not encrypted
- For premium apps: ProGuard (Android) + symbolication strip (iOS) reduces leakage

Don't rely on obfuscation for security — only for friction.

---

## Audit checklist (pre-release)

- [ ] All tokens in SecureStore
- [ ] No `console.log` of PII / tokens (`grep -r "console.log" src | grep -iE "token|password"`)
- [ ] All endpoints HTTPS (`grep -r "http://" src` returns nothing)
- [ ] `.env*` files in `.gitignore` and not committed
- [ ] `npm audit` clean (or accepted risks documented)
- [ ] Deep link auth callbacks validate state nonce
- [ ] Cert pinning enabled for payment / auth endpoints
- [ ] Sentry beforeSend scrubs sensitive keys
- [ ] Biometric gate on high-risk flows
- [ ] zod schemas on all api boundaries

---

## Do / Don't

| ✅                             | ❌                             |
| ------------------------------ | ------------------------------ |
| `expo-secure-store` for tokens | MMKV / AsyncStorage for tokens |
| HTTPS everywhere               | HTTP in dev "for convenience"  |
| Backend = trust boundary       | Trust client validation        |
| Universal Links / App Links    | Only custom scheme deep links  |
| Validate deep link state       | Auto-grant session on callback |
| zod parse api responses        | Trust BE shape blindly         |
| Log identifiers                | Log content / tokens           |

---

## Common pitfalls

- **Tokens in MMKV "for performance"** — MMKV files are readable from backup. Use SecureStore.
- **`EXPO_PUBLIC_API_KEY=sk_...`** — `EXPO_PUBLIC_` is public by definition. Never put secrets there.
- **Cert pinning to a cert (not key)** — breaks on cert rotation. Pin to public key.
- **`console.log(error)` includes token in headers** — sanitize errors before logging.
- **OAuth without PKCE** — required for public clients (mobile). No client secret in app.

---

## See also

- `u-storage` — SecureStore vs MMKV decision
- `u-api` — interceptors, auth header, refresh flow
- `u-error-handling` — Sentry beforeSend scrubbing
- `u-finalize` — pre-commit secret scan
