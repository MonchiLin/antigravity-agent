import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import App from '@/App.tsx';
import { useAntigravityAccount } from '@/modules/use-antigravity-account.ts';
import {
  useAccountAdditionData,
  type AccountAdditionData,
} from '@/modules/use-account-addition-data.ts';
import { useDbMonitoringStore } from '@/modules/db-monitoring-store';
import { useAntigravityIsRunning } from '@/hooks/use-antigravity-is-running.ts';
import { useImportExportAccount } from '@/modules/use-import-export-accounts.ts';
import { useSignInNewAntigravityAccount } from '@/hooks/use-sign-in-new-antigravity-account.ts';
import { PlatformCommands } from '@/commands/PlatformCommands.ts';
import { TrayCommands } from '@/commands/TrayCommands.ts';
import type { AntigravityAccount } from '@/commands/types/account.types.ts';
import {
  mockAccounts,
  mockAdditionDataMap,
  sortingTestAccounts,
  sortingTestAdditionDataMap,
} from '@/stories/mocks/accountSessions.ts';

// Storybook 下不需要真实原生能力；只提供空壳避免运行时报错。
if (typeof window !== 'undefined') {
  const w = window as any;
  w.__TAURI_INTERNALS__ ??= {
    invoke: async () => null,
    transformCallback: () => 0,
    convertFileSrc: (p: string) => p,
  };
  w.__TAURI_EVENT_PLUGIN_INTERNALS__ ??= { unregisterListener: () => { } };
}

PlatformCommands.detectInstallation = async () => null as any;
TrayCommands.updateMenu = async () => '';

const seedMocks = (
  accounts: AntigravityAccount[],
  additionData: Record<string, AccountAdditionData>
) => {
  useAntigravityAccount.setState({
    accounts,
    currentAuthInfo: accounts[0] ?? null,
    getAccounts: async () => accounts,
    delete: async () => { },
    insertOrUpdateCurrentAccount: async () => { },
    switchToAccount: async () => { },
    clearAllAccounts: async () => { },
  });

  useAccountAdditionData.setState({
    data: additionData,
    update: async () => { },
  });

  useDbMonitoringStore.setState({
    start: async () => { },
    stop: async () => { },
    addListener: () => () => { },
  });

  useAntigravityIsRunning.setState({
    isRunning: false,
    isChecking: false,
    lastChecked: null,
    check: async () => { },
    start: () => { },
    stop: () => { },
  });

  useImportExportAccount.setState({
    isImporting: false,
    isExporting: false,
    isCheckingData: false,
    importDialogIsOpen: false,
    exportDialogIsOpen: false,
    pendingImportPath: undefined,
    pendingExportData: undefined,
    setImporting: () => { },
    setExporting: () => { },
    setCheckingData: () => { },
    openImportDialog: () => { },
    closeImportDialog: () => { },
    openExportDialog: () => { },
    closeExportDialog: () => { },
    submitImportPassword: async () => { },
    submitExportPassword: async () => { },
    importConfig: async () => { },
    exportConfig: async () => { },
  });

  useSignInNewAntigravityAccount.setState({
    processing: false,
    run: async () => { },
  });
};

const meta = {
  title: 'App/App',
  component: App,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'light-gray',
      values: [
        { name: 'light-gray', value: '#f8fafc' },
        { name: 'dark', value: '#0f172a' },
      ],
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof App>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    seedMocks(mockAccounts, mockAdditionDataMap);
    return <App />;
  },
};

export const EmptyState: Story = {
  render: () => {
    seedMocks([], {});
    return <App />;
  },
};

export const SortByResetTime: Story = {
  render: () => {
    seedMocks(sortingTestAccounts, sortingTestAdditionDataMap);
    return <App />;
  },
  parameters: {
    docs: {
      description: {
        story: `测试二级排序功能。选择按 Claude 排序，预期顺序：
        1. User High Quota (80%) - 有配额的排最前
        2. User With Quota (50%) - 有配额的排第二
        3. User 30 Min - 零配额，30分钟后恢复
        4. User 3 Hours - 零配额，3小时后恢复
        5. User 12 Hours - 零配额，12小时后恢复
        6. User 2 Days - 零配额，2天后恢复
        7. User 4 Days - 零配额，4天后恢复
        8. User 1 Week - 零配额，1周后恢复`,
      },
    },
  },
};

/**
 * 测试当前账户置顶
 * 
 * 场景：中间某个账户是当前活动账户
 * 预期：无论如何排序，活动账户始终在第一位
 */
export const ActiveAccountPinned: Story = {
  render: () => {
    // 使用第 5 个账户作为当前账户（bruce.wayne，配额很高）
    // 但我们把它的配额改低，看它是否仍然置顶
    const activeEmail = 'bruce.wayne@wayneenterprises.com';

    const modifiedAdditionData = {
      ...mockAdditionDataMap,
      [activeEmail]: {
        ...mockAdditionDataMap[activeEmail],
        claudeQuote: 0.1, // 故意给很低的配额
        geminiProQuote: 0.05,
      },
    };

    // 设置 currentAuthInfo 为 bruce.wayne
    useAntigravityAccount.setState({
      accounts: mockAccounts,
      currentAuthInfo: mockAccounts.find(a => a.antigravityAuthStatus.email === activeEmail) ?? null,
      getAccounts: async () => mockAccounts,
      delete: async () => { },
      insertOrUpdateCurrentAccount: async () => { },
      switchToAccount: async () => { },
      clearAllAccounts: async () => { },
    });

    useAccountAdditionData.setState({
      data: modifiedAdditionData,
      update: async () => { },
    });

    useDbMonitoringStore.setState({
      start: async () => { },
      stop: async () => { },
      addListener: () => () => { },
    });

    useAntigravityIsRunning.setState({
      isRunning: false,
      isChecking: false,
      lastChecked: null,
      check: async () => { },
      start: () => { },
      stop: () => { },
    });

    useImportExportAccount.setState({
      isImporting: false,
      isExporting: false,
      isCheckingData: false,
      importDialogIsOpen: false,
      exportDialogIsOpen: false,
      pendingImportPath: undefined,
      pendingExportData: undefined,
      setImporting: () => { },
      setExporting: () => { },
      setCheckingData: () => { },
      openImportDialog: () => { },
      closeImportDialog: () => { },
      openExportDialog: () => { },
      closeExportDialog: () => { },
      submitImportPassword: async () => { },
      submitExportPassword: async () => { },
      importConfig: async () => { },
      exportConfig: async () => { },
    });

    useSignInNewAntigravityAccount.setState({
      processing: false,
      run: async () => { },
    });

    return <App />;
  },
  parameters: {
    docs: {
      description: {
        story: '测试活动账户置顶。Bruce Wayne 的配额很低，但作为当前账户应始终在第一位。',
      },
    },
  },
};
