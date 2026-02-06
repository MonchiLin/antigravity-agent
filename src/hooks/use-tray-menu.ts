import { useEffect, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import { logger } from "../lib/logger.ts";
import { useAntigravityAccount } from "@/modules/use-antigravity-account.ts";
import { TrayCommands } from "@/commands/TrayCommands.ts";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

/**
 * 系统托盘菜单更新 Hook
 * 负责监听账户变化并更新托盘菜单
 */
export function useTrayMenu() {
  const { accounts, switchToAccount } = useAntigravityAccount();
  const { t, i18n } = useTranslation('common');

  // 更新托盘菜单
  const updateTrayMenu = useCallback(async (accountsList: string[]) => {
    try {
      logger.info("更新托盘菜单", { accountCount: accountsList.length });

      const labels = {
        show_main: t('tray.showMain'),
        quit: t('tray.quit'),
      };

      await TrayCommands.updateMenu(accountsList, labels);

      logger.info("托盘菜单更新成功");
    } catch (error) {
      logger.error("更新托盘菜单失败", error);
    }
  }, [t]);

  // 监听来自后端的账户切换请求
  useEffect(() => {
    const unlisten = listen("tray-switch-account", async (event) => {
      const email = event.payload as string;
      logger.info("收到托盘账户切换请求", { email });

      try {
        await switchToAccount(email);
        toast.success(t('notifications:account.switchSuccess', { email }));
      } catch (error) {
        logger.error("托盘账户切换失败", error);
        toast.error(`切换账户失败: ${error}`); // This should ideally be translated too but dynamic error messages are tricky
      }
    });

    return () => {
      unlisten.then(f => f());
    };
  }, [switchToAccount, t]);


  // 当账户列表或语言变化时更新托盘菜单
  useEffect(() => {
    // 提取邮箱列表并更新托盘菜单
    const emails = accounts.map((user) => user.antigravityAuthStatus.email);
    updateTrayMenu(emails);
  }, [accounts.length, updateTrayMenu, i18n.language]);
}
