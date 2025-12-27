import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import commonEN from '@/assets/locales/en/common.json';
import commonZhCN from '@/assets/locales/zh-CN/common.json';
import commonZhTW from '@/assets/locales/zh-TW/common.json';

import dashboardEN from '@/assets/locales/en/dashboard.json';
import dashboardZhCN from '@/assets/locales/zh-CN/dashboard.json';
import dashboardZhTW from '@/assets/locales/zh-TW/dashboard.json';

import accountEN from '@/assets/locales/en/account.json';
import accountZhCN from '@/assets/locales/zh-CN/account.json';
import accountZhTW from '@/assets/locales/zh-TW/account.json';

import settingsEN from '@/assets/locales/en/settings.json';
import settingsZhCN from '@/assets/locales/zh-CN/settings.json';
import settingsZhTW from '@/assets/locales/zh-TW/settings.json';

import notificationsEN from '@/assets/locales/en/notifications.json';
import notificationsZhCN from '@/assets/locales/zh-CN/notifications.json';
import notificationsZhTW from '@/assets/locales/zh-TW/notifications.json';

import importExportEN from '@/assets/locales/en/import-export.json';
import importExportZhCN from '@/assets/locales/zh-CN/import-export.json';
import importExportZhTW from '@/assets/locales/zh-TW/import-export.json';
import updateEN from '@/assets/locales/en/update.json';
import updateZhCN from '@/assets/locales/zh-CN/update.json';
import updateZhTW from '@/assets/locales/zh-TW/update.json';

const resources = {
  en: {
    common: commonEN,
    dashboard: dashboardEN,
    account: accountEN,
    settings: settingsEN,
    notifications: notificationsEN,
    importExport: importExportEN,
    update: updateEN,
  },
  'zh-CN': {
    common: commonZhCN,
    dashboard: dashboardZhCN,
    account: accountZhCN,
    settings: settingsZhCN,
    notifications: notificationsZhCN,
    importExport: importExportZhCN,
    update: updateZhCN,
  },
  'zh-TW': {
    common: commonZhTW,
    dashboard: dashboardZhTW,
    account: accountZhTW,
    settings: settingsZhTW,
    notifications: notificationsZhTW,
    importExport: importExportZhTW,
    update: updateZhTW,
  },
};

// Initialize with default language, will be updated from Tauri later
let cachedLanguage: string | null = null;

import { SettingsCommands } from '@/commands/SettingsCommands';

// Custom language detector that uses cached value from Tauri
const TauriLanguageDetector = {
  name: 'tauriLanguageDetector',
  lookup: (): string | undefined => {
    return cachedLanguage || undefined;
  },
  cacheUserLanguage: async (lng: string): Promise<void> => {
    cachedLanguage = lng;
    try {
      await SettingsCommands.setLanguage(lng);
    } catch (error) {
      console.error('Failed to save language to Tauri:', error);
    }
  },
};

// Load language from Tauri asynchronously after initialization
async function loadLanguageFromTauri() {
  try {
    const settings = await SettingsCommands.getAll();
    if (settings?.language) {
      cachedLanguage = settings.language;
      await i18n.changeLanguage(settings.language);
    }
  } catch (error) {
    console.error('Failed to load language from Tauri:', error);
  }
}

i18n
  // Detect user language
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  // Initialize i18next
  .init({
    resources,
    fallbackLng: 'en', // Default to English to match backend
    defaultNS: 'common',
    ns: ['common', 'dashboard', 'account', 'settings', 'notifications', 'importExport', 'update'],

    interpolation: {
      escapeValue: false, // React already escapes
    },

    detection: {
      // Detection order (tauriLanguageDetector won't block since it's synchronous now)
      order: [
        'navigator',    // Browser language
        'htmlTag',      // HTML tag
      ],
      caches: [], // Don't use localStorage (we use Tauri)
    },

    react: {
      useSuspense: false, // Disable suspense
      bindI18n: 'languageChanged',
      bindI18nStore: '',
      transEmptyNodeValue: '',
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'p'],
    },

    // Development features
    debug: import.meta.env.DEV,
    saveMissing: import.meta.env.DEV,
    missingKeyHandler: (lng, ns, key) => {
      if (import.meta.env.DEV) {
        console.warn(`Missing translation: [${lng}] ${ns}:${key}`);
      }
    },
  });

// Load language from Tauri after i18n is initialized
loadLanguageFromTauri();

export default i18n;
