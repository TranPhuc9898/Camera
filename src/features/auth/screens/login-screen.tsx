import { Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LoginForm } from '@/features/auth/components/login-form';

export function LoginScreen() {
  const { t } = useTranslation();
  return (
    <View className="flex-1 justify-center bg-white px-6 dark:bg-gray-950">
      <Text className="mb-2 text-3xl font-bold dark:text-white">{t('auth.welcome')}</Text>
      <Text className="mb-8 text-gray-500">{t('app.name')}</Text>
      <LoginForm onSuccess={() => router.replace('/(app)')} />
      <View className="mt-6 flex-row justify-center">
        <Text className="text-gray-500">{t('auth.createAccount')} </Text>
        <Link href="/(auth)/register" className="font-semibold text-primary-600">
          {t('auth.register')}
        </Link>
      </View>
    </View>
  );
}
