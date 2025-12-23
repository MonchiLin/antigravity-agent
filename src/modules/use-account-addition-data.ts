import { create } from "zustand";
import { AntigravityAccount } from "@/commands/types/account.types.ts";
import { CloudCodeAPI } from "@/services/cloudcode-api.ts";
import { CloudCodeAPITypes } from "@/services/cloudcode-api.types.ts";
import { AccountCommands } from "@/commands/AccountCommands.ts";
import { ProcessCommands } from "@/commands/ProcessCommands.ts";
import { logger } from "@/lib/logger";

type State = {
  data: Record<string, AccountAdditionData>
}

type Actions = {
  update: (antigravityAccount: AntigravityAccount) => Promise<void>
}

// 暂时不知道 ultra 定义, 先模糊匹配,
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
    console.log(antigravityAccount)
    let codeAssistResponse: CloudCodeAPITypes.LoadCodeAssistResponse | CloudCodeAPITypes.ErrorResponse = null

    try {
      codeAssistResponse = await CloudCodeAPI.loadCodeAssist(antigravityAccount.auth.access_token);
    } catch (e) {
      codeAssistResponse = e
    }

    // 如果存在错误, 则使用 ouath 重新获取 access token
    if ("error" in codeAssistResponse) {
      logger.debug('获取 code assist 失败, 尝试刷新 access token', {
        module: 'use-account-addition-data',
      })
      // 避免冲突 如果是当前账户, 并且 Antigravity 在运行, 则不刷新 access token
      const currentAccount = await AccountCommands.getCurrentAntigravityAccount()
      const isAntigravityRunning = await ProcessCommands.isRunning()
      if (antigravityAccount.context.email === currentAccount?.context.email && isAntigravityRunning) {
        return
      }
      // 刷新 access token
      const refreshTokenResponse = await CloudCodeAPI.refreshAccessToken(antigravityAccount.auth.id_token);
      // 更新一下内存里面的 access token, 这里就不写入本地了
      antigravityAccount.auth.access_token = refreshTokenResponse.access_token;
    }

    codeAssistResponse = await CloudCodeAPI.loadCodeAssist(antigravityAccount.auth.access_token);

    const modelsResponse = await CloudCodeAPI.fetchAvailableModels(antigravityAccount.auth.access_token, codeAssistResponse.cloudaicompanionProject);
    const userInfoResponse = await CloudCodeAPI.userinfo(antigravityAccount.auth.access_token);

    logger.debug('获取 AccountAdditionData 成功', {
      module: 'use-account-addition-data',
      email: antigravityAccount.context.email,
    })

    setState({
      data: {
        ...getState().data,
        [antigravityAccount.context.email]: {
          geminiProQuote: modelsResponse.models["gemini-3-pro-high"].quotaInfo.remainingFraction,
          geminiProQuoteRestIn: modelsResponse.models["gemini-3-pro-high"].quotaInfo.resetTime,
          geminiFlashQuote: modelsResponse.models["gemini-3-flash"].quotaInfo.remainingFraction,
          geminiFlashQuoteRestIn: modelsResponse.models["gemini-3-flash"].quotaInfo.resetTime,
          geminiImageQuote: modelsResponse.models["gemini-3-pro-image"].quotaInfo.remainingFraction,
          geminiImageQuoteRestIn: modelsResponse.models["gemini-3-pro-image"].quotaInfo.resetTime,
          claudeQuote: modelsResponse.models["claude-opus-4-5-thinking"].quotaInfo.remainingFraction,
          claudeQuoteRestIn: modelsResponse.models["claude-opus-4-5-thinking"].quotaInfo.resetTime,
          userAvatar: userInfoResponse.picture,
          userId: userInfoResponse.id,
        }
      }
    })
  }
}))
