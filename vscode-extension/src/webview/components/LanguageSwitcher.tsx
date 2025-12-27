import React from 'react';
import { VSCodeDropdown, VSCodeOption } from '@vscode/webview-ui-toolkit/react';
import { useTranslation } from 'react-i18next';

export const LanguageSwitcher: React.FC = () => {
    const { i18n } = useTranslation();

    const handleChange = (e: any) => {
        // VSCodeDropdown matches the value to the option value
        const val = e.target.value;
        if (val) {
            i18n.changeLanguage(val);
        }
    };

    // Prepare options
    // Using native names for languages so users can find them easily
    const languages = [
        { code: 'en', label: 'English' },
        { code: 'zh-CN', label: '简体中文' },
        { code: 'zh-TW', label: '繁體中文' }
    ];

    return (
        <div className="flex items-center">
            {/* Use a small dropdown for languages */}
            <VSCodeDropdown
                value={i18n.language}
                onChange={handleChange}
                style={{ minWidth: '100px', height: '24px' }} // Compact style
            >
                {languages.map((lang) => (
                    <VSCodeOption key={lang.code} value={lang.code}>
                        {lang.label}
                    </VSCodeOption>
                ))}
            </VSCodeDropdown>
        </div>
    );
};
