/**
 * 设置相关类型定义
 */

/**
 * 应用设置
 */
export interface AppSettings {
  /** 系统托盘是否启用 */
  system_tray_enabled: boolean;

  /** 静默启动是否启用 */
  silent_start_enabled: boolean;

  /** Debug Mode：记录 debug 级别日志 */
  debugMode: boolean;

  /** 隐私模式：用户卡片信息打码（邮箱/用户名） */
  privateMode: boolean;

  /** 语言偏好设置 */
  language: string;
}
