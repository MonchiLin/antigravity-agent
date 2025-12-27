import type { Resource } from 'i18next';

// Supported languages
export type SupportedLanguage = 'en' | 'zh-CN' | 'zh-TW';

export interface LanguageConfig {
    code: SupportedLanguage;
    name: string;
    nativeName: string;
    flag: string; // Emoji flag
}

export const languages: LanguageConfig[] = [
    {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        flag: '🇺🇸',
    },
    {
        code: 'zh-CN',
        name: 'Simplified Chinese',
        nativeName: '简体中文',
        flag: '🇨🇳',
    },
    {
        code: 'zh-TW',
        name: 'Traditional Chinese',
        nativeName: '繁體中文',
        flag: '🇹🇼',
    },
];
