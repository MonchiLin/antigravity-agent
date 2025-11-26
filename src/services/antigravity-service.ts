import {invoke} from '@tauri-apps/api/core';
import {logger} from '../utils/logger';
import toast from 'react-hot-toast';

/**
 * Antigravity 服务 - 处理 Antigravity 相关操作
 */
export class AntigravityService {
  /**
   * 备份并重启Antigravity
   */
  static async backupAndRestartAntigravity(): Promise<void> {
    try {
      logger.info('开始执行备份并重启 Antigravity 流程', {
        module: 'AntigravityService',
        action: 'backup_and_restart_start'
      });
      toast('正在关闭 Antigravity 进程...');

      logger.info('调用后端 backup_and_restart_antigravity 命令', {
        module: 'AntigravityService',
        action: 'call_backend_command'
      });
      const result = await invoke('backup_and_restart_antigravity') as string;
      logger.info('后端命令执行成功', {
        module: 'AntigravityService',
        action: 'backend_command_success',
        result: result
      });

      toast.success(result);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('备份并重启失败', {
        module: 'AntigravityService',
        action: 'backup_and_restart_failed',
        error: errorMessage
      });
      logger.error('完整错误对象', {
        module: 'AntigravityService',
        action: 'full_error_object',
        error: error
      });
      throw new Error(`备份并重启失败: ${errorMessage}`);
    }
  }
}
