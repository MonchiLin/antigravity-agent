import 'react-i18next';

// Import translation files for type inference
// source of truth: en
import type common from './locales/en/common.json';
import type dashboard from './locales/en/dashboard.json';

declare module 'react-i18next' {
    interface CustomTypeOptions {
        defaultNS: 'common';
        resources: {
            common: typeof common;
            dashboard: typeof dashboard;
        };
    }
}
