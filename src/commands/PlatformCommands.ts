import { universalInvoke } from '@/lib/invoke-adapter';
import type { PlatformInfo, DetectionResult, PathConfig } from './types/platform.types';

/**
 * 平台工具命令
 */
export class PlatformCommands {
  /**
   * 获取平台信息
   * @returns 平台信息，包含操作系统、架构、路径等
   */
  static async getInfo(): Promise<PlatformInfo> {
    return universalInvoke('get_platform_info');
  }

  /**
   * 查找 Antigravity 安装位置
   * @returns 所有可能的安装路径
   */
  static async findInstallations(): Promise<string[]> {
    return universalInvoke('find_antigravity_installations');
  }

  /**
   * 检测 Antigravity 数据库路径
   * @returns 检测结果
   */
  static async detectInstallation(): Promise<DetectionResult> {
    return universalInvoke('detect_antigravity_installation');
  }

  /**
   * 检测 Antigravity 可执行文件路径
   * @returns 检测结果
   */
  static async detectExecutable(): Promise<DetectionResult> {
    return universalInvoke('detect_antigravity_executable');
  }

  /**
   * 验证 Antigravity 可执行文件路径
   * @param path 文件路径
   * @returns 是否有效
   */
  static async validateExecutable(path: string): Promise<boolean> {
    return universalInvoke('validate_antigravity_executable', { path });
  }

  /**
   * 保存用户自定义的 Antigravity 可执行文件路径
   * @param path 文件路径
   * @returns 保存结果消息
   */
  static async saveAntigravityExecutable(path: string): Promise<string> {
    return universalInvoke('save_antigravity_executable', { path });
  }

  /**
   * 获取当前配置的路径
   * @returns 路径配置
   */
  static async getCurrentPaths(): Promise<PathConfig> {
    return universalInvoke('get_current_paths');
  }
}
