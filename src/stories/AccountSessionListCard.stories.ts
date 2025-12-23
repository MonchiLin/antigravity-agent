import type { Meta, StoryObj } from '@storybook/react';
import { AccountSessionListCard } from '@/components/business/AccountSessionListCard.tsx';
import { fn } from 'storybook/test';
import {
  mockSessionItems,
  tierOptions,
} from '@/stories/mocks/accountSessions.ts';

// 定义元数据
const meta = {
  title: 'Components/AccountSessionListCard',
  component: AccountSessionListCard,
  parameters: {
    // 让组件在画板居中显示
    layout: 'centered',
    // 背景色微调，方便看清卡片的阴影
    backgrounds: {
      default: 'light-gray',
      values: [
        { name: 'light-gray', value: '#f8fafc' },
        { name: 'dark', value: '#0f172a' },
      ],
    },
  },
  tags: ['autodocs'],
  // 配置控件类型
  argTypes: {
    geminiProQuote: {
      control: { type: 'range', min: -1, max: 1, step: 0.01 },
      description: 'Gemini Pro 使用配额 (0-1, 或 -1 代表未知)',
    },
    geminiProQuoteRestIn: {
      control: 'text',
      description: 'Gemini Pro 重置时间',
    },
    geminiFlashQuote: {
      control: { type: 'range', min: -1, max: 1, step: 0.01 },
      description: 'Gemini Flash 使用配额 (0-1, 或 -1 代表未知)',
    },
    geminiFlashQuoteRestIn: {
      control: 'text',
      description: 'Gemini Flash 重置时间',
    },
    geminiImageQuote: {
      control: { type: 'range', min: -1, max: 1, step: 0.01 },
      description: 'Gemini Image 使用配额 (0-1, 或 -1 代表未知)',
    },
    geminiImageQuoteRestIn: {
      control: 'text',
      description: 'Gemini Image 重置时间',
    },
    claudeQuote: {
      control: { type: 'range', min: -1, max: 1, step: 0.01 },
      description: 'Claude 使用配额 (0-1, 或 -1 代表未知)',
    },
    claudeQuoteRestIn: {
      control: 'text',
      description: 'Claude 重置时间',
    },
    tier: {
      control: { type: 'select' },
      options: tierOptions,
      description: '账户级别',
    },
    userAvatar: {
      control: 'text',
      description: '用户头像 URL',
    },
    isCurrentUser: {
      control: 'boolean',
      description: '是否为当前登录用户',
    },
  },
  // 模拟回调函数
  args: {
    onSelect: fn(),
    onSwitch: fn(),
    onDelete: fn(),
    tier: 'free-tier',
  },
} satisfies Meta<typeof AccountSessionListCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// 示例 1: 默认状态（其他用户）
export const Default: Story = {
  args: {
    ...mockSessionItems[0],
    isCurrentUser: false,
  },
};

// 示例 2: 当前用户
// 此时应该显示 "当前" 徽标，且操作按钮被禁用
export const CurrentUser: Story = {
  args: {
    ...mockSessionItems[0],
    isCurrentUser: true,
  },
};

// 示例 3: 配额未知状态 (-1)
// 进度条应该显示灰色或未知样式
export const UnknownUsage: Story = {
  args: {
    ...mockSessionItems[2],
    isCurrentUser: false,
  },
};

// 示例 4: 额度即将耗尽
export const HighUsage: Story = {
  args: {
    ...mockSessionItems[1],
    geminiProQuote: 0.98,
    claudeQuote: 1.0,
    isCurrentUser: false,
  },
};

// 示例 5: 未知等级 (Unknown Tier) - 触发兜底逻辑
export const UnknownTier: Story = {
  args: {
    ...mockSessionItems[0],
    tier: 'future-tier-v2' as any, // 强制转换为任意值以触发 unknownTier = true
    isCurrentUser: false,
  },
};
