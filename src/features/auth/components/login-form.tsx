import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLoginMutation } from '@/features/auth/api';
import type { LoginPayload } from '@/features/auth/types';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type Props = {
  onSuccess?: () => void;
};

export function LoginForm({ onSuccess }: Props) {
  const { t } = useTranslation();
  const { control, handleSubmit, formState } = useForm<LoginPayload>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const mutation = useLoginMutation();

  const onSubmit = handleSubmit((values) => {
    mutation.mutate(values, { onSuccess: () => onSuccess?.() });
  });

  return (
    <View className="gap-4">
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, value } }) => (
          <TextInput
            className="rounded-lg border border-gray-300 px-4 py-3 text-base dark:border-gray-700 dark:text-white"
            placeholder={t('auth.email')}
            autoCapitalize="none"
            keyboardType="email-address"
            value={value}
            onChangeText={onChange}
          />
        )}
      />
      {formState.errors.email && (
        <Text className="text-sm text-red-500">{formState.errors.email.message}</Text>
      )}
      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, value } }) => (
          <TextInput
            className="rounded-lg border border-gray-300 px-4 py-3 text-base dark:border-gray-700 dark:text-white"
            placeholder={t('auth.password')}
            secureTextEntry
            value={value}
            onChangeText={onChange}
          />
        )}
      />
      {formState.errors.password && (
        <Text className="text-sm text-red-500">{formState.errors.password.message}</Text>
      )}
      <Pressable
        onPress={onSubmit}
        disabled={mutation.isPending}
        className="items-center rounded-lg bg-primary-600 py-3 active:opacity-80"
      >
        {mutation.isPending ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="font-semibold text-white">{t('auth.submit')}</Text>
        )}
      </Pressable>
      {mutation.isError && (
        <Text className="text-center text-sm text-red-500">
          {(mutation.error as Error).message}
        </Text>
      )}
    </View>
  );
}
