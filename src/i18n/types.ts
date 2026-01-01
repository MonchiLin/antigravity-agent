import 'react-i18next';

// Import translation files for type inference
// We use 'en' as the source of truth for types
import type common from '@/assets/locales/en/common.json';
import type dashboard from '@/assets/locales/en/dashboard.json';
import type account from '@/assets/locales/en/account.json';
import type settings from '@/assets/locales/en/settings.json';
import type notifications from '@/assets/locales/en/notifications.json';
import type importExport from '@/assets/locales/en/import-export.json';

declare module 'react-i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof common;
      dashboard: typeof dashboard;
      account: typeof account;
      settings: typeof settings;
      notifications: typeof notifications;
      importExport: typeof importExport;
    };
  }
}

