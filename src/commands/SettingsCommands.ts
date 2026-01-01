import { invoke } from '@tauri-apps/api/core';
import type { AppSettings } from './types/settings.types';

/**
 * 设置管理命令
 */
export class SettingsCommands {

  /**
   * 保存系统托盘状态
   * @param enabled 是否启用
   * @returns 保存后的状态
   */
  static async saveSystemTrayState(enabled: boolean): Promise<boolean> {
    return invoke('save_system_tray_state', { enabled });
  }

  /**
   * 保存静默启动状态
   * @param enabled 是否启用
   * @returns 保存结果消息
   */
  static async saveSilentStartState(enabled: boolean): Promise<boolean> {
    return invoke('save_silent_start_state', { enabled });
  }

  /**
   * 保存隐私模式状态
   * @param enabled 是否启用
   * @returns 保存后的状态
   */
  static async savePrivateModeState(enabled: boolean): Promise<boolean> {
    return invoke('save_private_mode_state', { enabled });
  }

  /**
   * 保存 Debug Mode 状态
   * @param enabled 是否启用
   * @returns 保存后的状态
   */
  static async saveDebugModeState(enabled: boolean): Promise<boolean> {
    return invoke('save_debug_mode_state', { enabled });
  }

  /**
   * 获取所有应用设置
   * @returns 应用设置对象
   */
  static async getAll(): Promise<AppSettings> {
    return invoke('get_all_settings');
  }

  /**
   * 获取语言偏好设置
   * @returns 语言代码 (en, zh-CN, zh-TW)
   */
  static async getLanguage(): Promise<string> {
    return invoke('get_language');
  }

  /**
   * 保存语言偏好设置
   * @param language 语言代码 (en, zh-CN, zh-TW)
   */
  static async setLanguage(language: string): Promise<void> {
    return invoke('set_language', { language });
  }
}
