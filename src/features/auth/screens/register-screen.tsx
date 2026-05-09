import { Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';

export function RegisterScreen() {
  const { t } = useTranslation();
  return (
    <View className="flex-1 justify-center bg-white px-6 dark:bg-gray-950">
      <Text className="mb-2 text-3xl font-bold dark:text-white">{t('auth.createAccount')}</Text>
      <Text className="mb-8 text-gray-500">TODO: register form</Text>
      <Link href="/(auth)/login" className="text-center font-semibold text-primary-600">
        {t('auth.login')}
      </Link>
    </View>
  );
}
