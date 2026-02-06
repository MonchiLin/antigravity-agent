import React, { useEffect, useRef, useState } from "react";
import BusinessUserDetail from "@/components/business/AccountDetailModal.tsx";
import { useAntigravityAccount, useCurrentAntigravityAccount } from "@/modules/use-antigravity-account.ts";
import { useAccountAdditionData, UserTier } from "@/modules/use-account-addition-data.ts";
import { useTrayMenu } from "@/hooks/use-tray-menu.ts";
import { Modal } from 'antd';
import toast from 'react-hot-toast';
import { maskEmail } from "@/lib/string-masking.ts";
import { useAppGlobalLoader } from "@/modules/use-app-global-loader.ts";
import { AccountSessionList, AccountSessionListAccountItem } from "@/components/business/AccountSessionList.tsx";
import AccountsListToolbar, { type ListToolbarValue } from "@/components/business/AccountsListToolbar.tsx";
import { logger } from "@/lib/logger.ts";
import { useTranslation } from 'react-i18next';
import dayjs from "dayjs";
import { useInstallExtension } from "@/hooks/use-install-extension.tsx";
import { clearInterval, setInterval } from 'worker-timers';
import {useAntigravityIsRunning} from "@/hooks/use-antigravity-is-running.ts";

const tierRank: Record<UserTier, number> = {
  'g1-ultra-tier': 0,
  'g1-pro-tier': 1,
  'free-tier': 2,
};

// 获取重置时间戳，用于二级排序（无效值排最后）
const toTs = (s?: string) => s ? dayjs(s).valueOf() || Infinity : Infinity;

export function AppContent() {
  const { t } = useTranslation(['account', 'notifications']);
  const [isUserDetailOpen, setIsUserDetailOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AccountSessionListAccountItem | null>(null);

  const { install } = useInstallExtension();

  // Use selectors to prevent infinite render loops
  const accounts = useAntigravityAccount((state) => state.accounts);
  const getAccounts = useAntigravityAccount((state) => state.getAccounts);
  const deleteAccount = useAntigravityAccount((state) => state.delete);
  const clearAllAccounts = useAntigravityAccount((state) => state.clearAllAccounts);
  const switchToAccount = useAntigravityAccount((state) => state.switchToAccount);
  const insertOrUpdateCurrentAccount = useAntigravityAccount((state) => state.insertOrUpdateCurrentAccount);
  const accountAdditionData = useAccountAdditionData();
  const currentAntigravityAccount = useCurrentAntigravityAccount();
  const appGlobalLoader = useAppGlobalLoader();
  const antigravityIsRunning = useAntigravityIsRunning()
  const [condition, setCondition] = useState<ListToolbarValue>({
    sortKey: 'tier',
    query: '',
    tiers: null,
  });

  // 初始化托盘菜单更新
  useTrayMenu();

  // 组件挂载时获取用户列表
  useEffect(() => {
    const loadUsers = async () => {
      try {
        await getAccounts();
      } catch (error) {
        toast.error(t('notifications:fetchUserListFailed', { error }));
      } finally {
      }
    };

    loadUsers();
  }, [getAccounts, t]);

  // 定时获取用户额外数据
  const fetchAccountAdditionDataTimer = useRef(null)

  useEffect(() => {
    if (fetchAccountAdditionDataTimer.current) {
      clearInterval(fetchAccountAdditionDataTimer.current)
    }

    const task = () => {
      accounts.forEach(async (user) => {
        try {
          await accountAdditionData.update(user)
        } catch (e) {
          logger.error(t('notifications:fetchUserDataFailed'), {
            module: 'AppContent',
            email: user.antigravity_auth_status.email,
            error: e instanceof Error ? e.message : String(e)
          })
        }
      })
    }

    fetchAccountAdditionDataTimer.current = setInterval(() => {
      task()
    }, 1000 * 30)

    task()

    return () => {
      clearInterval(fetchAccountAdditionDataTimer.current)
    }
  }, [accounts.length, t]);

  // 由于 Antigravity (>=1.16.5) 仅在程序关闭时保存凭证，您需要先关闭一次 Antigravity 才能完成账户保存。
  // 所以这里判断下，发现程序关闭下就调用 insertOrUpdateCurrentAccount
  useEffect(() => {
    antigravityIsRunning.addStatusChangeListener(isRunning => {
      insertOrUpdateCurrentAccount()
    })
  }, []);

  // 用户详情处理
  const handleUserClick = (account: AccountSessionListAccountItem) => {
    setSelectedUser(account);
    setIsUserDetailOpen(true);
  };

  const handleUserDetailClose = () => {
    setIsUserDetailOpen(false);
    setSelectedUser(null);
  };

  const handleDeleteBackup = (user: AccountSessionListAccountItem) => {
    Modal.confirm({
      centered: true,
      title: t('account:delete.title'),
      content: <p className={"wrap-break-word whitespace-pre-line"}>
        {t('account:delete.message', { email: user.email })}
      </p>,
      onOk() {
        return confirmDeleteAccount(user.email);
      },
      onCancel() {
      },
    });
  };

  const confirmDeleteAccount = async (email: string) => {
    await deleteAccount(email);
    toast.success(t('account:delete.success', { email }));
  };

  const handleSwitchAccount = async (user: AccountSessionListAccountItem) => {
    try {
      appGlobalLoader.open({ label: t('account:switch.loading', { email: maskEmail(user.email) }) });
      await switchToAccount(user.email);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(t('account:switch.error', { error: errorMessage }));
    } finally {
      appGlobalLoader.close();
    }
  };

  const handleClearAllBackups = () => {
    if (accounts.length === 0) {
      toast.error(t('account:clearAll.noBackups'));
      return;
    }

    Modal.confirm({
      centered: true,
      title: t('account:clearAll.title'),
      content: <p className={"wrap-break-word whitespace-pre-line"}>
        {t('account:clearAll.message', { count: accounts.length })}
      </p>,
      onOk() {
        return confirmClearAllBackups();
      },
      onCancel() {
      },
    });
  };

  const confirmClearAllBackups = async () => {
    try {
      await clearAllAccounts();
      toast.success(t('account:clearAll.success'));
    } catch (error) {
      toast.error(t('account:clearAll.error', { error }));
      throw error;
    }
  };


  const accountsWithData: AccountSessionListAccountItem[] = accounts.map((account) => {
    const accountAdditionDatum = accountAdditionData.data[account.antigravity_auth_status.email]

    return {
      geminiProQuote: accountAdditionDatum?.geminiProQuote ?? -1,
      geminiProQuoteRestIn: accountAdditionDatum?.geminiProQuoteRestIn,
      geminiFlashQuote: accountAdditionDatum?.geminiFlashQuote ?? -1,
      geminiFlashQuoteRestIn: accountAdditionDatum?.geminiFlashQuoteRestIn,
      geminiImageQuote: accountAdditionDatum?.geminiImageQuote ?? -1,
      geminiImageQuoteRestIn: accountAdditionDatum?.geminiImageQuoteRestIn,
      claudeQuote: accountAdditionDatum?.claudeQuote ?? -1,
      claudeQuoteRestIn: accountAdditionDatum?.claudeQuoteRestIn,
      email: account.antigravity_auth_status.email,
      nickName: account.antigravity_auth_status.name,
      userAvatar: accountAdditionDatum?.userAvatar ?? "",
      apiKey: account.antigravity_auth_status.api_key ?? '',
      // 使用后端返回的真实 tier_id，如果获取失败或为 null 则回退到 'free-tier'
      tier: (account.user_status?.raw_data?.plan?.tier_id || 'free-tier') as UserTier,
      persisted: account.oauth_token !== null,
    }
  })

  const normalizedQuery = condition.query.trim().toLowerCase();
  const visibleAccounts = accountsWithData
    .filter(account => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        account.email.toLowerCase().includes(normalizedQuery) ||
        account.nickName?.toLowerCase().includes(normalizedQuery);

      const matchesTier =
        condition.tiers == null ||
        condition.tiers.length === 0 ||
        condition.tiers.includes(account.tier);

      return matchesQuery && matchesTier;
    })
    .sort((a, b) => {
      // 当前账户始终置顶
      const currentEmail = currentAntigravityAccount?.antigravity_auth_status.email;
      if (a.email === currentEmail) return -1;
      if (b.email === currentEmail) return 1;

      const nameA = a.nickName || a.email;
      const nameB = b.nickName || b.email;
      const byName = nameA.localeCompare(nameB);

      switch (condition.sortKey) {
        case 'name':
          return byName;
        case 'claude': {
          const diff = (b.claudeQuote ?? -1) - (a.claudeQuote ?? -1);
          if (diff !== 0) return diff;
          return toTs(a.claudeQuoteRestIn) - toTs(b.claudeQuoteRestIn) || byName;
        }
        case 'gemini-pro': {
          const diff = (b.geminiProQuote ?? -1) - (a.geminiProQuote ?? -1);
          if (diff !== 0) return diff;
          return toTs(a.geminiProQuoteRestIn) - toTs(b.geminiProQuoteRestIn) || byName;
        }
        case 'gemini-flash': {
          const diff = (b.geminiFlashQuote ?? -1) - (a.geminiFlashQuote ?? -1);
          if (diff !== 0) return diff;
          return toTs(a.geminiFlashQuoteRestIn) - toTs(b.geminiFlashQuoteRestIn) || byName;
        }
        case 'gemini-image': {
          const diff = (b.geminiImageQuote ?? -1) - (a.geminiImageQuote ?? -1);
          if (diff !== 0) return diff;
          return toTs(a.geminiImageQuoteRestIn) - toTs(b.geminiImageQuoteRestIn) || byName;
        }
        case 'tier': {
          const diff = tierRank[a.tier] - tierRank[b.tier];
          return diff !== 0 ? diff : byName;
        }
        default:
          return byName;
      }
    });

  return (
    <>
      <section className="flex flex-col relative flex-1">
        <AccountsListToolbar
          tiers={condition.tiers}
          query={condition.query}
          sortKey={condition.sortKey}
          total={visibleAccounts.length}
          onChange={setCondition}
        />
        <AccountSessionList
          accounts={visibleAccounts}
          onSwitch={handleSwitchAccount}
          onDelete={handleDeleteBackup}
          onSelect={handleUserClick}
          currentUserEmail={currentAntigravityAccount?.antigravity_auth_status.email}
        />
      </section>

      <BusinessUserDetail
        isOpen={isUserDetailOpen}
        onOpenChange={handleUserDetailClose}
        account={selectedUser}
      />
    </>
  );
}
