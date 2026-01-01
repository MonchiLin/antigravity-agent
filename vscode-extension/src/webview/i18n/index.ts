import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import './types'; // Import type definitions

// Import local translation files
import commonEN from './locales/en/common.json';
import commonZhCN from './locales/zh-CN/common.json';
import commonZhTW from './locales/zh-TW/common.json';

import dashboardEN from './locales/en/dashboard.json';
import dashboardZhCN from './locales/zh-CN/dashboard.json';
import dashboardZhTW from './locales/zh-TW/dashboard.json';

// Declare window interface extension
declare global {
    interface Window {
        VSCODE_LANGUAGE?: string;
    }
}

const resources = {
    en: {
        common: commonEN,
        dashboard: dashboardEN,
    },
    'zh-CN': {
        common: commonZhCN,
        dashboard: dashboardZhCN,
    },
    'zh-TW': {
        common: commonZhTW,
        dashboard: dashboardZhTW,
    },
};

// Custom language detector that reads from window.VSCODE_LANGUAGE
const vscodeLanguageDetector = {
    name: 'vscode-language-detector',

    lookup(options: any) {
        // Check injected variable first
        if (window.VSCODE_LANGUAGE) {
            return window.VSCODE_LANGUAGE;
        }
        return undefined;
    },

    cacheUserLanguage(lng: string) {
        // No caching needed as VS Code controls this
    }
};

const languageDetector = new LanguageDetector();
languageDetector.addDetector(vscodeLanguageDetector);

i18n
    .use(languageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        // Prioritize our custom detector
        detection: {
            order: ['vscode-language-detector', 'navigator'],
            caches: [] // Don't cache in localStorage since we want to follow VS Code
        },
        defaultNS: 'common',
        ns: ['common', 'dashboard'],

        interpolation: {
            escapeValue: false,
        },
    });

export default i18n;
