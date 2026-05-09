import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import { storage, StorageKeys } from '@/lib/storage/mmkv';
import en from '@/translations/en.json';
import vi from '@/translations/vi.json';

const deviceLocale = getLocales()[0]?.languageCode ?? 'en';
const stored = storage.getString(StorageKeys.LOCALE);

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    vi: { translation: vi },
  },
  lng: stored ?? (deviceLocale === 'vi' ? 'vi' : 'en'),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
});

export function setLocale(locale: 'en' | 'vi') {
  storage.set(StorageKeys.LOCALE, locale);
  void i18n.changeLanguage(locale);
}

export default i18n;
