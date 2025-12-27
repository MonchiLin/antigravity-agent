import React from 'react';
import { useTranslation } from 'react-i18next';
import { Dropdown, type MenuProps } from 'antd';
import { Languages } from 'lucide-react';
import { cn } from '@/lib/utils.ts';
import { languages, type SupportedLanguage } from '@/i18n/config.ts';
import { SettingsCommands } from '@/commands/SettingsCommands.ts';
import { logger } from '@/lib/logger.ts';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

interface LanguageSwitcherProps {
  className?: string;
  showNativeName?: boolean;
}

export const LanguageDropdown: React.FC<LanguageSwitcherProps> = ({
  className,
  showNativeName = true,
}) => {
  const { t, i18n } = useTranslation();
  // Loading state not strictly needed for Dropdown but keeping logic same
  const [loading, setLoading] = React.useState(false);

  const currentLanguage = i18n.language as SupportedLanguage;

  const handleLanguageChange = async (newLanguage: SupportedLanguage) => {
    if (newLanguage === currentLanguage) return;

    setLoading(true);
    try {
      // Change language in i18next
      await i18n.changeLanguage(newLanguage);

      // Persist to Tauri backend
      await SettingsCommands.setLanguage(newLanguage);

      // Update dayjs locale
      const localeMap: Record<SupportedLanguage, string> = {
        'en': 'en',
        'zh-CN': 'zh-cn',
        'zh-TW': 'zh-tw',
      };
      dayjs.locale(localeMap[newLanguage]);

      toast.success(t('settings:language.changeSuccess'));

      logger.info('Language changed', {
        module: 'LanguageDropdown',
        from: currentLanguage,
        to: newLanguage,
      });
    } catch (error) {
      toast.error(t('settings:language.changeError'));
      logger.error('Failed to change language', {
        module: 'LanguageDropdown',
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  };

  const menuItems: MenuProps['items'] = languages.map((lang) => ({
    key: lang.code,
    label: (
      <div className="flex items-center gap-2">
        <span>{lang.flag}</span>
        <span>{showNativeName ? lang.nativeName : lang.name}</span>
      </div>
    ),
    onClick: () => handleLanguageChange(lang.code),
  }));

  return (
    <Dropdown menu={{ items: menuItems }} placement="bottomRight" trigger={['hover']}>
      <button
        className={cn(
          "flex items-center justify-center p-2 rounded-md transition-all duration-200 ease-in-out cursor-pointer",
          "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
          "hover:bg-slate-100 dark:hover:bg-slate-800",
          "active:scale-95",
          className
        )}
        title={t('settings:language.change')}
        disabled={loading}
      >
        <Languages className="w-5 h-5" />
      </button>
    </Dropdown>
  );
};
