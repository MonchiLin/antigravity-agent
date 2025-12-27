import React from 'react';
import { ArrowUpDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils.ts';
import { BaseInput } from '@/components/base-ui/BaseInput';
import type { UserTier } from '@/modules/use-account-addition-data.ts';
import { Select as AntSelect } from 'antd';
import { LineShadowText } from "@/components/ui/line-shadow-text.tsx";
import UpdateBadge from "@/components/business/UpdateBadge.tsx";
import { useTranslation } from 'react-i18next';
import { LanguageDropdown } from '@/components/business/LanguageDropdown.tsx';

export type ListSortKey = 'name' | 'claude' | 'gemini-pro' | 'gemini-flash' | 'gemini-image' | 'tier';
export type ListToolbarValue = {
  query: string;
  sortKey: ListSortKey;
  tiers: UserTier[] | null;
};

const useSortOptions = () => {
  const { t } = useTranslation('dashboard');
  return React.useMemo<Array<{ value: ListSortKey; label: string }>>(() => [
    { value: 'name', label: t('sort.name') },
    { value: 'gemini-pro', label: t('sort.geminiPro') },
    { value: 'claude', label: t('sort.claude') },
    { value: 'gemini-flash', label: t('sort.geminiFlash') },
    { value: 'gemini-image', label: t('sort.geminiImage') },
    { value: 'tier', label: t('sort.tier') },
  ], [t]);
};

// Use a hook or component to get dynamic translations for map values
const useTierUiMap = () => {
  const { t } = useTranslation('common');
  return React.useMemo<Record<UserTier, { label: string; accentClass: string }>>(() => ({
    'free-tier': {
      label: t('tier.free'),
      accentClass: 'text-slate-900 dark:text-slate-50',
    },
    'g1-pro-tier': {
      label: t('tier.pro'),
      accentClass: 'text-amber-700 dark:text-amber-300',
    },
    'g1-ultra-tier': {
      label: t('tier.ultra'),
      accentClass: 'text-violet-700 dark:text-violet-300',
    },
  }), [t]);
};

const allTiers: UserTier[] = ['free-tier', 'g1-pro-tier', 'g1-ultra-tier'];

export interface BusinessListToolbarProps {
  /** 列表总数 */
  total: number;
  /** 搜索关键字 */
  query: string;
  /** 排序 key */
  sortKey: ListSortKey;
  /** 任一项变更时回调（返回完整状态） */
  onChange: (next: ListToolbarValue) => void;
  className?: string;
  // 为 null 时，显示所有层次
  tiers?: UserTier[] | null;
}

/**
 * Business Component: ListToolbar
 * 列表顶部工具栏（标题 + 搜索 + 自定义动作/过滤器插槽）
 */
const AccountsListToolbar: React.FC<BusinessListToolbarProps> = ({
  total,
  query,
  sortKey,
  onChange,
  className,
  tiers,
}) => {
  const { t } = useTranslation('dashboard');
  const sortOptions = useSortOptions();
  const tierUiMap = useTierUiMap();
  const normalizedTiers = tiers && tiers.length > 0 ? tiers : null;
  const selectedTiers = normalizedTiers ?? [];

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ query: e.target.value, sortKey, tiers: normalizedTiers });
  };

  const handleClearSearch = () => {
    onChange({ query: '', sortKey, tiers: normalizedTiers });
  };

  const handleSortChange = (next: ListSortKey) => {
    onChange({ query, sortKey: next, tiers: normalizedTiers });
  };

  const toggleTier = (tier: UserTier) => {
    const exists = selectedTiers.includes(tier);
    const nextTiers = exists
      ? selectedTiers.filter(t => t !== tier)
      : [...selectedTiers, tier];

    const nextNormalized =
      nextTiers.length === 0 || nextTiers.length === allTiers.length
        ? null
        : nextTiers;

    onChange({ query, sortKey, tiers: nextNormalized });
  };

  const clearTiers = () => {
    onChange({ query, sortKey, tiers: null });
  };

  const containerClasses = [
    'flex items-center justify-between gap-3 px-3 py-2 rounded-xl border',
    'bg-white/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700',
    'backdrop-blur-sm shadow-sm',
  ];

  return (
    <div className={cn(...containerClasses, className)}>
      <div>
        <a target={"_blank"} href={"https://github.com/MonchiLin/antigravity-agent"} className="text-4xl leading-none font-semibold tracking-tighter text-balance cursor-pointer">
          <span>Antigravity</span>
          {/* padding 修复截断 */}
          <LineShadowText className={"pr-2 pb-1"}>Agent</LineShadowText>
        </a>
        <UpdateBadge />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="inline-flex items-center w-fit rounded-full border border-slate-200 bg-slate-100 p-0.5 transition-colors hover:border-slate-300">
          {/* 左侧：标签部分 (较弱的视觉) */}
          <span className="px-2 py-0.5 text-xs font-medium text-slate-600">
            {t('toolbar.accounts')}
          </span>
          <span className="flex min-w-[20px] items-center justify-center rounded-full bg-white px-1.5 py-0.5 text-xs font-bold text-slate-800 shadow-sm">
            {total}
          </span>
        </div>

        <BaseInput
          value={query}
          onChange={handleSearchChange}
          placeholder={t('toolbar.searchPlaceholder')}
          leftIcon={<Search className="h-4 w-4" />}
          rightIcon={
            query ? (
              <button
                type="button"
                onClick={handleClearSearch}
                className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : undefined
          }
          containerClassName="w-64 !space-y-0 ml-2"
          className="py-1.5 h-8 text-sm"
        />
        {/* 层次筛选：分段按钮 */}
        <div
          className={cn(
            'flex items-center gap-0.5 p-0.5 rounded-lg border',
            'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
          )}
        >
          <button
            type="button"
            onClick={clearTiers}
            className={cn(
              'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
              selectedTiers.length === 0
                ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-900/60'
            )}
          >
            {t('toolbar.filterAll')}
          </button>
          {allTiers.map(tier => {
            const isActive = selectedTiers.includes(tier);
            const { label, accentClass } = tierUiMap[tier];
            return (
              <button
                key={tier}
                type="button"
                onClick={() => toggleTier(tier)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                  isActive
                    ? cn('bg-white dark:bg-slate-900 shadow-sm', accentClass)
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-900/60'
                )}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* 排序选择：紧凑胶囊 */}
        <div
          className={cn(
            'flex items-center gap-1 h-8 px-2 rounded-lg border',
            'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
          )}
        >
          <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
          <AntSelect
            value={sortKey}
            onChange={(v) => handleSortChange(v as ListSortKey)}
            size="small"
            variant="borderless"
            popupMatchSelectWidth={false}
            options={sortOptions.map(opt => ({
              value: opt.value,
              label: opt.label,
            }))}
            className={cn(
              'min-w-[120px]',
              '[&_.ant-select-selection-item]:text-xs'
            )}
          />
        </div>

        {/* 语言切换器：新增 */}
        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
        <LanguageDropdown />
      </div>
    </div>
  );
};

export default AccountsListToolbar;
