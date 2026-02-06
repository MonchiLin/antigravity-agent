import type { AntigravityAccount } from '@/commands/types/account.types.ts';
import type { AccountSessionListAccountItem } from '@/components/business/AccountSessionList.tsx';
import type {
  AccountAdditionData,
  UserTier,
} from '@/modules/use-account-addition-data.ts';

type BaseMockAccount = {
  email: string;
  planName: string;
  tier: UserTier;
  nickName?: string;
  userAvatar?: string;
  apiKey?: string;
  idToken?: string;
  quotas?: Partial<AccountAdditionData>;
};

export const tierOptions: UserTier[] = ['free-tier', 'g1-pro-tier', 'g1-ultra-tier'];

const defaultQuotas: AccountAdditionData = {
  geminiProQuote: 0.7,
  geminiProQuoteRestIn: '2025-12-21T10:50:06Z',
  geminiFlashQuote: 0.5,
  geminiFlashQuoteRestIn: '2025-12-21T10:50:06Z',
  geminiImageQuote: 0.45,
  geminiImageQuoteRestIn: '2025-12-21T10:50:06Z',
  claudeQuote: 0.65,
  claudeQuoteRestIn: '2025-12-21T10:50:06Z',
  userAvatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Default',
  userId: 'mock_default',
};

const baseMockAccounts: BaseMockAccount[] = [
  {
    email: 'admin.ops@company.com',
    planName: 'Admin User',
    nickName: 'Admin User',
    tier: 'g1-pro-tier',
    quotas: {
      geminiProQuote: 0.85,
      geminiFlashQuote: 0.66,
      geminiImageQuote: 0.42,
      claudeQuote: 0.92,
      userAvatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Admin',
      userId: 'mock_admin',
    },
  },
  {
    email: 'jason.bourne@cia.gov',
    planName: 'Jason Bourne',
    nickName: 'Jason Bourne',
    tier: 'free-tier',
    quotas: {
      geminiProQuote: 0.15,
      geminiFlashQuote: 0.22,
      geminiImageQuote: 0.18,
      claudeQuote: 0.4,
      userAvatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Jason',
      userId: 'mock_jason',
    },
  },
  {
    email: 'guest.temp@provider.net',
    planName: 'Unknown Guest',
    nickName: 'Unknown Guest',
    tier: 'g1-ultra-tier',
    quotas: {
      geminiProQuote: -1,
      geminiFlashQuote: -1,
      geminiImageQuote: -1,
      claudeQuote: -1,
      geminiProQuoteRestIn: '',
      geminiFlashQuoteRestIn: '',
      geminiImageQuoteRestIn: '',
      claudeQuoteRestIn: '',
      userAvatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Guest',
      userId: 'mock_guest',
    },
  },
  {
    email: 'sarah.connor@skynet.ai',
    planName: 'Sarah Connor',
    nickName: 'Sarah Connor',
    tier: 'g1-pro-tier',
    quotas: {
      geminiProQuote: 0.62,
      geminiFlashQuote: 0.6,
      geminiImageQuote: 0.5,
      claudeQuote: 0.7,
      userAvatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Sarah',
      userId: 'mock_sarah',
    },
  },
  {
    email: 'bruce.wayne@wayneenterprises.com',
    planName: 'Bruce Wayne',
    nickName: 'Bruce Wayne',
    tier: 'g1-ultra-tier',
    quotas: {
      geminiProQuote: 0.95,
      geminiFlashQuote: 0.9,
      geminiImageQuote: 0.75,
      claudeQuote: 0.88,
      userAvatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Bruce',
      userId: 'mock_bruce',
    },
  },
  {
    email: 'ellen.ripley@weyland.com',
    planName: 'Ellen Ripley',
    nickName: 'Ellen Ripley',
    tier: 'free-tier',
    quotas: {
      geminiProQuote: 0.3,
      geminiFlashQuote: 0.28,
      geminiImageQuote: 0.2,
      claudeQuote: 0.2,
      userAvatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Ripley',
      userId: 'mock_ripley',
    },
  },
  {
    email: 'neo.anderson@matrix.io',
    planName: 'Neo Anderson',
    nickName: 'Neo Anderson',
    tier: 'g1-pro-tier',
    quotas: {
      geminiProQuote: 0.55,
      geminiFlashQuote: 0.5,
      geminiImageQuote: 0.48,
      claudeQuote: 0.6,
      userAvatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Neo',
      userId: 'mock_neo',
    },
  },
  {
    email: 'trinity@matrix.io',
    planName: 'Trinity',
    nickName: 'Trinity',
    tier: 'free-tier',
    quotas: {
      geminiProQuote: 0.25,
      geminiFlashQuote: 0.2,
      geminiImageQuote: 0.12,
      claudeQuote: 0.45,
      userAvatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Trinity',
      userId: 'mock_trinity',
    },
  },
  {
    email: 'deckard@blade.runner',
    planName: 'Rick Deckard',
    nickName: 'Rick Deckard',
    tier: 'g1-ultra-tier',
    quotas: {
      geminiProQuote: 0.1,
      geminiFlashQuote: 0.08,
      geminiImageQuote: 0.05,
      claudeQuote: 0.12,
      userAvatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Deckard',
      userId: 'mock_deckard',
    },
  },
];


function makeAccount(base: BaseMockAccount): AntigravityAccount {
  const [local] = base.email.split('@');
  return {
    antigravity_auth_status: {
      api_key: base.apiKey ?? `sk_mock_${local}`,
      email: base.email,
      name: base.nickName || base.planName,
      // Mocking nested properties if needed for backward compatibility or future use,
      // but based on current type definition, we only need core fields.
    },
    oauth_token: null,
    user_status: null
  };
}

function makeAdditionData(base: BaseMockAccount): AccountAdditionData {
  return {
    ...defaultQuotas,
    ...base.quotas,
  };
}

function makeSessionItem(
  base: BaseMockAccount,
  addition: AccountAdditionData
): AccountSessionListAccountItem {
  const [local] = base.email.split('@');
  return {
    nickName: base.nickName ?? local,
    email: base.email,
    userAvatar: addition.userAvatar ?? defaultQuotas.userAvatar,
    geminiProQuote: addition.geminiProQuote,
    geminiProQuoteRestIn: addition.geminiProQuoteRestIn,
    geminiFlashQuote: addition.geminiFlashQuote,
    geminiFlashQuoteRestIn: addition.geminiFlashQuoteRestIn,
    geminiImageQuote: addition.geminiImageQuote,
    geminiImageQuoteRestIn: addition.geminiImageQuoteRestIn,
    claudeQuote: addition.claudeQuote,
    claudeQuoteRestIn: addition.claudeQuoteRestIn,
    tier: base.tier,
    apiKey: `sk_${local}`,
    persisted: true,
  };
}

function buildGridItems(
  items: AccountSessionListAccountItem[],
  total = 9
): AccountSessionListAccountItem[] {
  return Array.from({ length: total }).map((_, i) => {
    const base = items[i % items.length];
    const [name, domain] = base.email.split('@');
    return {
      ...base,
      email: `${name}+${i}@${domain}`,
      nickName: `${base.nickName} #${i + 1}`,
      apiKey: `${base.apiKey}_${i}`,
    };
  });
}

const longEmailItem: AccountSessionListAccountItem = {
  nickName:
    'ThisIsAnExcessivelyLongNickName_ToTest_TextOverflow_AndLayoutStability_InUserCardHeader',
  email:
    'this.is.a.super.long.email.address.with.many.sections.and.tags+storybook-overflow-test@subdomain1.subdomain2.subdomain3.subdomain4.some-very-long-company-domain.example.corp.company.com',
  userAvatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=LongEmail',
  geminiProQuote: 0.66,
  geminiProQuoteRestIn: '2025-12-22T09:00:00Z',
  geminiFlashQuote: 0.52,
  geminiFlashQuoteRestIn: '2025-12-22T09:00:00Z',
  geminiImageQuote: 0.48,
  geminiImageQuoteRestIn: '2025-12-22T09:00:00Z',
  claudeQuote: 0.77,
  claudeQuoteRestIn: '2025-12-22T09:00:00Z',
  tier: 'g1-pro-tier',
  apiKey: 'sk_mock_long_email',
  persisted: true,
};

export const mockAccounts = baseMockAccounts.map(makeAccount);

export const mockAdditionDataMap: Record<string, AccountAdditionData> =
  Object.fromEntries(
    baseMockAccounts.map((base) => [base.email, makeAdditionData(base)])
  );

export const mockSessionItems: AccountSessionListAccountItem[] =
  baseMockAccounts.map((base) =>
    makeSessionItem(base, makeAdditionData(base))
  );

export const gridSessionItems = buildGridItems(mockSessionItems);

export const longEmailSessionItems: AccountSessionListAccountItem[] = [
  longEmailItem,
  ...mockSessionItems,
];

// ==========================================
// 排序测试专用 Mock 数据
// ==========================================

/**
 * 用于测试二级排序的账户数据
 * - 部分账户有配额，部分配额为 0
 * - 零配额账户有不同的重置时间
 */
const sortingTestBaseAccounts: BaseMockAccount[] = [
  {
    email: 'user-4days@test.com',
    planName: 'User 4 Days',
    nickName: 'User 4 Days',
    tier: 'free-tier',
  },
  {
    email: 'user-3hours@test.com',
    planName: 'User 3 Hours',
    nickName: 'User 3 Hours',
    tier: 'free-tier',
  },
  {
    email: 'user-2days@test.com',
    planName: 'User 2 Days',
    nickName: 'User 2 Days',
    tier: 'g1-pro-tier',
  },
  {
    email: 'user-30min@test.com',
    planName: 'User 30 Min',
    nickName: 'User 30 Min',
    tier: 'free-tier',
  },
  {
    email: 'user-1week@test.com',
    planName: 'User 1 Week',
    nickName: 'User 1 Week',
    tier: 'g1-ultra-tier',
  },
  {
    email: 'user-12hours@test.com',
    planName: 'User 12 Hours',
    nickName: 'User 12 Hours',
    tier: 'free-tier',
  },
  {
    email: 'user-with-quota@test.com',
    planName: 'User With Quota (50%)',
    nickName: 'User With Quota (50%)',
    tier: 'g1-pro-tier',
  },
  {
    email: 'user-high-quota@test.com',
    planName: 'User High Quota (80%)',
    nickName: 'User High Quota (80%)',
    tier: 'g1-ultra-tier',
  },
];

// 动态生成重置时间
const hoursFromNow = (h: number) =>
  new Date(Date.now() + h * 60 * 60 * 1000).toISOString();

export const sortingTestAccounts = sortingTestBaseAccounts.map(makeAccount);

export const sortingTestAdditionDataMap: Record<string, AccountAdditionData> = {
  'user-4days@test.com': {
    ...defaultQuotas,
    claudeQuote: 0,
    claudeQuoteRestIn: hoursFromNow(96), // 4 天
    userAvatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=4days',
    userId: 'user_4days',
  },
  'user-3hours@test.com': {
    ...defaultQuotas,
    claudeQuote: 0,
    claudeQuoteRestIn: hoursFromNow(3), // 3 小时
    userAvatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=3hours',
    userId: 'user_3hours',
  },
  'user-2days@test.com': {
    ...defaultQuotas,
    claudeQuote: 0,
    claudeQuoteRestIn: hoursFromNow(48), // 2 天
    userAvatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=2days',
    userId: 'user_2days',
  },
  'user-30min@test.com': {
    ...defaultQuotas,
    claudeQuote: 0,
    claudeQuoteRestIn: hoursFromNow(0.5), // 30 分钟
    userAvatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=30min',
    userId: 'user_30min',
  },
  'user-1week@test.com': {
    ...defaultQuotas,
    claudeQuote: 0,
    claudeQuoteRestIn: hoursFromNow(168), // 1 周
    userAvatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=1week',
    userId: 'user_1week',
  },
  'user-12hours@test.com': {
    ...defaultQuotas,
    claudeQuote: 0,
    claudeQuoteRestIn: hoursFromNow(12), // 12 小时
    userAvatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=12hours',
    userId: 'user_12hours',
  },
  'user-with-quota@test.com': {
    ...defaultQuotas,
    claudeQuote: 0.5, // 有配额
    claudeQuoteRestIn: hoursFromNow(24),
    userAvatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=withquota',
    userId: 'user_withquota',
  },
  'user-high-quota@test.com': {
    ...defaultQuotas,
    claudeQuote: 0.8, // 高配额
    claudeQuoteRestIn: hoursFromNow(24),
    userAvatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=highquota',
    userId: 'user_highquota',
  },
};
