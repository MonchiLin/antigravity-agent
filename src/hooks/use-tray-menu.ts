import {useEffect} from "react";
import {listen} from "@tauri-apps/api/event";
import {logger} from "../lib/logger.ts";
import {useAntigravityAccount} from "@/modules/use-antigravity-account.ts";
import {TrayCommands} from "@/commands/TrayCommands.ts";
import toast from "react-hot-toast";

/**
 * 系统托盘菜单更新 Hook
 * 负责监听账户变化并更新托盘菜单
 */
export function useTrayMenu() {
  const { accounts, switchToAccount } = useAntigravityAccount();

  // 更新托盘菜单
  const updateTrayMenu = async (accounts: string[]) => {
    try {
      logger.info("更新托盘菜单", { accountCount: accounts.length });

      await TrayCommands.updateMenu(accounts);

      logger.info("托盘菜单更新成功");
    } catch (error) {
      logger.error("更新托盘菜单失败", error);
      // 不显示 toast 错误，因为这可能在后台发生
    }
  };

  // 监听来自后端的账户切换请求
  useEffect(() => {
    const unlisten = listen("tray-switch-account", async (event) => {
      const email = event.payload as string;
      logger.info("收到托盘账户切换请求", { email });

      try {
        await switchToAccount(email);
        toast.success(`已切换到账户: ${email}`);
      } catch (error) {
        logger.error("托盘账户切换失败", error);
        toast.error(`切换账户失败: ${error}`);
      }
    });

    return () => {
      unlisten.then(f => f());
    };
  }, [switchToAccount]);

  // 当账户列表变化时更新托盘菜单
  useEffect(() => {
    if (accounts.length > 0) {
      // 提取邮箱列表并更新托盘菜单
      const emails = accounts.map((user) => user.context.email);
      updateTrayMenu(emails);
    } else {
      // 没有账户时清空托盘菜单
      updateTrayMenu([]);
    }
  }, [accounts.length]);
}
