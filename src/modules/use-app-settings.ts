import { create } from "zustand";
import { SettingsCommands } from "@/commands/SettingsCommands.ts";
import { logger } from "@/lib/logger.ts";
import { relaunch } from "@tauri-apps/plugin-process";
import i18n, { type SupportedLanguage } from "@/i18n";

type State = {
  hydrated: boolean;
  systemTrayEnabled: boolean;
  silentStartEnabled: boolean;
  debugMode: boolean;
  privateMode: boolean;
  language: SupportedLanguage;
  loading: {
    hydrate: boolean;
    systemTray: boolean;
    silentStart: boolean;
    debugMode: boolean;
    privateMode: boolean;
    language: boolean;
  };
}

type Actions = {
  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;
  setSystemTrayEnabled: (enabled: boolean) => Promise<void>;
  setSilentStartEnabled: (enabled: boolean) => Promise<void>;
  setDebugMode: (enabled: boolean) => Promise<void>;
  setPrivateMode: (enabled: boolean) => Promise<void>;
  setLanguage: (language: SupportedLanguage) => Promise<void>;
}

export const useAppSettings = create<State & Actions>((setState, getState) => {
  let hydrationPromise: Promise<void> | null = null;

  const loadAllSettings = async (): Promise<{
    systemTrayEnabled: boolean;
    silentStartEnabled: boolean;
    debugMode: boolean;
    privateMode: boolean;
    language: SupportedLanguage;
  }> => {
    const settings = await SettingsCommands.getAll();

    return {
      systemTrayEnabled: typeof settings?.system_tray_enabled === 'boolean' ? settings.system_tray_enabled : false,
      silentStartEnabled: typeof settings?.silent_start_enabled === 'boolean' ? settings.silent_start_enabled : false,
      debugMode: typeof settings?.debugMode === 'boolean' ? settings.debugMode : false,
      privateMode: typeof settings?.privateMode === 'boolean' ? settings.privateMode : true,
      language: (settings?.language as SupportedLanguage) || 'en',
    }
  }

  return {
    hydrated: false,
    // 默认保持当前行为：用户卡片信息打码
    systemTrayEnabled: false,
    silentStartEnabled: false,
    debugMode: false,
    privateMode: true,
    language: 'en',
    loading: {
      hydrate: false,
      systemTray: false,
      silentStart: false,
      debugMode: false,
      privateMode: false,
      language: false,
    },
    hydrate: async () => {
      if (getState().hydrated) return;

      if (!hydrationPromise) {
        setState(state => ({ loading: { ...state.loading, hydrate: true } }))

        hydrationPromise = loadAllSettings()
          .then(async (next) => {
            // 同步 i18n 语言设置
            if (next.language && next.language !== i18n.language) {
              await i18n.changeLanguage(next.language);
            }

            setState({
              ...next,
              hydrated: true,
            });
          })
          .catch((error) => {
            logger.error('加载设置失败', {
              module: 'AppSettings',
              action: 'hydrate_failed',
              error: error instanceof Error ? error.message : String(error)
            })

            setState({ hydrated: true });
          })
          .finally(() => {
            setState(state => ({ loading: { ...state.loading, hydrate: false } }))
            hydrationPromise = null;
          });
      }

      return hydrationPromise;
    },
    refresh: async () => {
      try {
        const next = await loadAllSettings();
        setState({
          ...next,
          hydrated: true,
        });
      } catch (error) {
        logger.error('刷新设置失败', {
          module: 'AppSettings',
          action: 'refresh_failed',
          error: error instanceof Error ? error.message : String(error)
        })
      }
    },
    setSystemTrayEnabled: async (enabled: boolean) => {
      if (getState().loading.systemTray) return;
      setState(state => ({ loading: { ...state.loading, systemTray: true } }))

      try {
        await SettingsCommands.saveSystemTrayState(enabled);

        const next = await loadAllSettings();
        setState({
          ...next,
          hydrated: true,
        });
      } catch (error) {
        logger.error('切换系统托盘失败', {
          module: 'AppSettings',
          action: 'set_system_tray_enabled_failed',
          enabled,
          error: error instanceof Error ? error.message : String(error)
        })
      } finally {
        setState(state => ({ loading: { ...state.loading, systemTray: false } }))
      }
    },
    setSilentStartEnabled: async (enabled: boolean) => {
      if (getState().loading.silentStart) return;
      setState(state => ({ loading: { ...state.loading, silentStart: true } }))

      try {
        // 启用静默启动前确保系统托盘已开启（否则后端会自动修正为 false）
        if (enabled && !getState().systemTrayEnabled) {
          setState(state => ({ loading: { ...state.loading, systemTray: true } }))
          try {
            const trayEnabled = await SettingsCommands.saveSystemTrayState(true);
            setState({ systemTrayEnabled: trayEnabled })
          } finally {
            setState(state => ({ loading: { ...state.loading, systemTray: false } }))
          }
        }

        await SettingsCommands.saveSilentStartState(enabled);

        const next = await loadAllSettings();
        setState({
          ...next,
          hydrated: true,
        });
      } catch (error) {
        logger.error('切换静默启动失败', {
          module: 'AppSettings',
          action: 'set_silent_start_enabled_failed',
          enabled,
          error: error instanceof Error ? error.message : String(error)
        })
      } finally {
        setState(state => ({ loading: { ...state.loading, silentStart: false } }))
      }
    },
    setDebugMode: async (enabled: boolean) => {
      if (getState().loading.debugMode) return;
      setState(state => ({ loading: { ...state.loading, debugMode: true } }))

      try {
        const result = await SettingsCommands.saveDebugModeState(enabled);
        const nextEnabled = typeof result === 'boolean' ? result : enabled;
        setState({ debugMode: nextEnabled, hydrated: true });
        await relaunch();
      } catch (error) {
        logger.error('切换 Debug Mode 失败', {
          module: 'AppSettings',
          action: 'set_debug_mode_failed',
          enabled,
          error: error instanceof Error ? error.message : String(error)
        })
      } finally {
        setState(state => ({ loading: { ...state.loading, debugMode: false } }))
      }
    },
    setPrivateMode: async (enabled: boolean) => {
      if (getState().loading.privateMode) return;
      setState(state => ({ loading: { ...state.loading, privateMode: true } }))

      try {
        const result = await SettingsCommands.savePrivateModeState(enabled);
        const nextEnabled = typeof result === 'boolean' ? result : enabled;
        setState({ privateMode: nextEnabled, hydrated: true });
      } catch (error) {
        logger.error('切换隐私模式失败', {
          module: 'AppSettings',
          action: 'set_private_mode_failed',
          enabled,
          error: error instanceof Error ? error.message : String(error)
        })
      } finally {
        setState(state => ({ loading: { ...state.loading, privateMode: false } }))
      }
    },
    setLanguage: async (language: SupportedLanguage) => {
      if (getState().loading.language) return;
      setState(state => ({ loading: { ...state.loading, language: true } }));

      try {
        await SettingsCommands.setLanguage(language);
        await i18n.changeLanguage(language);
        setState({ language, hydrated: true });
      } catch (error) {
        logger.error('切换语言失败', {
          module: 'AppSettings',
          action: 'set_language_failed',
          language,
          error: error instanceof Error ? error.message : String(error)
        });
      } finally {
        setState(state => ({ loading: { ...state.loading, language: false } }));
      }
    },
  }
})
