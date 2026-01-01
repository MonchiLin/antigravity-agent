import { create } from "zustand";
import { AntigravityAccount } from "@/commands/types/account.types.ts";
import { AccountMetricsCommands } from "@/commands/AccountMetricsCommands.ts";
import { logger } from "@/lib/logger";

type State = {
  data: Record<string, AccountAdditionData>
}

type Actions = {
  update: (antigravityAccount: AntigravityAccount) => Promise<void>
}

export type UserTier = 'free-tier' | 'g1-pro-tier' | 'g1-ultra-tier';

export interface AccountAdditionData {
  geminiProQuote: number
  geminiProQuoteRestIn: string
  geminiFlashQuote: number
  geminiFlashQuoteRestIn: string
  geminiImageQuote: number
  geminiImageQuoteRestIn: string
  claudeQuote: number
  claudeQuoteRestIn: string
  userAvatar: string
  userId: string
}

export const useAccountAdditionData = create<State & Actions>((setState, getState) => ({
  data: {},
  update: async (antigravityAccount: AntigravityAccount) => {
    const email = antigravityAccount.context.email;

    try {
      logger.debug(`开始获取账户指标 (Rust Singular): ${email}`);

      const metric = await AccountMetricsCommands.getAccountMetrics(email);

      // 映射 Rust 数据结构 -> 前端 Store 结构
      // 注意：后端返回的 quotas 数组需要转换为具名字段
      const findQuota = (name: string) => {
        const item = metric.quotas.find(q => q.model_name.includes(name));
        return {
          percentage: item ? item.percentage : -1,
          resetText: item ? item.reset_text : ""
        };
      };

      const geminiPro = findQuota("Gemini Pro");
      const geminiFlash = findQuota("Gemini Flash");
      const geminiImage = findQuota("Gemini Image");
      const claude = findQuota("Claude");

      logger.debug(`获取账户指标成功 (Rust Singular): ${email}`);

      setState({
        data: {
          ...getState().data,
          [email]: {
            geminiProQuote: geminiPro.percentage,
            geminiProQuoteRestIn: geminiPro.resetText,
            geminiFlashQuote: geminiFlash.percentage,
            geminiFlashQuoteRestIn: geminiFlash.resetText,
            geminiImageQuote: geminiImage.percentage,
            geminiImageQuoteRestIn: geminiImage.resetText,
            claudeQuote: claude.percentage,
            claudeQuoteRestIn: claude.resetText,
            userAvatar: metric.avatar_url,
            userId: metric.user_id,
          }
        }
      });

    } catch (error) {
      logger.error(`获取账户指标失败 (Rust): ${email}`, error);
    }
  }
}))
