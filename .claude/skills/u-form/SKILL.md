---
name: u-form
description: 'Forms with react-hook-form + zod resolver. Validators, submit guards, error display, async validation, RHF Controller wrapper. Triggers — form, react-hook-form, zod, validation, validator, submit, form errors, Controller, useForm, FormProvider.'
---

# u-form — Forms (RHF + zod)

## TL;DR

- Forms ALWAYS use `react-hook-form` + `@hookform/resolvers/zod` — never `useState` per field
- One zod schema per form, co-located in the form component file
- `<Controller>` wraps custom inputs; `register()` for native HTML-like
- Submit button disabled while `isSubmitting || !isValid`
- Show field error under input via `formState.errors.<field>?.message`
- Field-level errors are i18n keys; map at submit / via custom resolver

## When to load

Adding/editing any form: login, signup, profile edit, payment, filter modal with multi-step.

---

## Generate

```bash
npx plop form
# prompts: feature, name (kebab-case)
# creates src/features/<f>/components/<name>-form.tsx
```

---

## Form template

```tsx
// src/features/auth/components/sign-in-form.tsx
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Input } from '@/lib/ui/input';
import { Button } from '@/lib/ui/button';

const schema = z.object({
  email: z.string().email('form.email-invalid'),
  password: z.string().min(8, 'form.password-too-short'),
});
type SignInValues = z.infer<typeof schema>;

interface Props {
  onSubmit: (v: SignInValues) => Promise<void> | void;
}

export function SignInForm({ onSubmit }: Props) {
  const { t } = useTranslation();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<SignInValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: { email: '', password: '' },
  });

  return (
    <View className="gap-md">
      <Controller
        control={control}
        name="email"
        render={({ field: { value, onChange, onBlur } }) => (
          <Input
            label={t('auth.email')}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email && t(errors.email.message ?? '')}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field: { value, onChange, onBlur } }) => (
          <Input
            label={t('auth.password')}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            secureTextEntry
            error={errors.password && t(errors.password.message ?? '')}
          />
        )}
      />
      <Button
        intent="primary"
        loading={isSubmitting}
        disabled={!isValid || isSubmitting}
        onPress={handleSubmit(onSubmit)}
      >
        {t('auth.sign-in')}
      </Button>
    </View>
  );
}
```

**Why this shape:**

- Schema next to the component — moves with it during refactors
- Error messages are i18n keys, not user-visible strings — translation deferred to render
- `mode: 'onBlur'` → validate on field blur (less noisy than `'onChange'`, more responsive than `'onSubmit'`)
- `disabled={!isValid || isSubmitting}` → both checks — `isSubmitting` alone leaves submit clickable while typing first time

---

## Caller pattern

```tsx
// src/features/auth/screens/sign-in-screen.tsx
const { mutateAsync: signIn } = useSignIn();
const { t } = useTranslation();

const onSubmit = async (values: SignInValues) => {
  try {
    await signIn(values);
    router.replace('/(app)');
  } catch (err) {
    toast.error(errorMessage(t, err));
  }
};

return <SignInForm onSubmit={onSubmit} />;
```

Form does not call API directly — it hands values up. Screen owns the side-effects.

---

## Field types — zod helpers

```ts
const schema = z
  .object({
    required: z.string().min(1, 'form.required'),
    email: z.string().email('form.email-invalid'),
    phone: z.string().regex(/^\+?\d{9,12}$/, 'form.phone-invalid'),
    amount: z.coerce.number().positive('form.amount-positive'),
    date: z.coerce.date(),
    optional: z.string().optional(),
    select: z.enum(['a', 'b', 'c'], { message: 'form.select-required' }),
    checkbox: z.boolean().refine((v) => v === true, 'form.must-accept'),
    list: z.array(z.string()).min(1, 'form.list-empty'),
    password: z.string().min(8, 'form.password-too-short'),
    confirmPwd: z.string(),
  })
  .refine((v) => v.password === v.confirmPwd, {
    message: 'form.passwords-mismatch',
    path: ['confirmPwd'],
  });
```

---

## Async validation (e.g. email-taken)

```ts
const schema = z.object({
  email: z.string().email('form.email-invalid'),
})

const { control, ... } = useForm({
  resolver: zodResolver(schema),
})

// Server-side check on submit:
const onSubmit = async (v) => {
  const taken = await checkEmailExists(v.email)
  if (taken) {
    setError('email', { message: 'form.email-taken' })
    return
  }
  await signUp(v)
}
```

Avoid async refinements in zod — they make `isValidating` unreliable. Validate on submit or via debounced separate check.

---

## Field arrays

```tsx
import { useFieldArray } from 'react-hook-form';

const { fields, append, remove } = useFieldArray({ control, name: 'phones' });

return fields.map((f, i) => (
  <Controller
    key={f.id}
    name={`phones.${i}.number`}
    control={control}
    render={({ field }) => <Input {...field} />}
  />
));
```

`fields` carries stable `id` — use as React key.

---

## Multi-step

```tsx
const { trigger, getValues, ... } = useForm({ resolver: zodResolver(schema) })

const next = async () => {
  const ok = await trigger(['email', 'password'])  // only validate step 1 fields
  if (ok) setStep(2)
}
```

For separate-screen steps, lift `useForm` into a parent and wrap children with `<FormProvider>` + `useFormContext()`.

---

## Error display

`<Input>` wrapper accepts `error?: string` and renders below the field. ALWAYS pass:

```tsx
error={errors.field && t(errors.field.message ?? '')}
```

Don't render generic "Invalid input" — always the specific i18n key from the schema.

---

## Do / Don't

| ✅                               | ❌                              |
| -------------------------------- | ------------------------------- | -------------- | ------------------- |
| zod schema + `zodResolver`       | Manual `validate` per field     |
| `Controller` for custom inputs   | `useState` per field            |
| Schema messages = i18n keys      | Hard-coded English              |
| `disabled={!isValid              |                                 | isSubmitting}` | only `isSubmitting` |
| Submit hands values up to screen | Form calls `useMutation` itself |
| `mode: 'onBlur'`                 | `'onChange'` (noisy)            |

---

## Testing

```ts
import { render, fireEvent, waitFor } from '@testing-library/react-native'

it('disables submit until valid', async () => {
  const onSubmit = jest.fn()
  const { getByLabelText, getByText } = render(<SignInForm onSubmit={onSubmit} />)
  fireEvent.changeText(getByLabelText('Email'), 'a')
  fireEvent.press(getByText('Sign in'))
  await waitFor(() => expect(onSubmit).not.toHaveBeenCalled())
})
```

---

## See also

- `u-architecture` — form components live in `features/<f>/components/`
- `u-i18n` — error message keys go in vi.json + en.json
- `u-error-handling` — `errorMessage(t, err)` for submit failures
- `u-codegen` — `npx plop form` template
- `u-rn-ui` — `<Input>`, `<Button>` primitives
