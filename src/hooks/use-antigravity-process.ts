import {useCallback, useState} from 'react';
import {AntigravityService} from '../services/antigravity-service';
import {logger} from '../utils/logger';
import toast from 'react-hot-toast';

interface UseAntigravityProcessResult {
    isProcessLoading: boolean;
    backupAndRestartAntigravity: () => Promise<void>;
}

/**
 * Antigravity 进程管理 Hook
 * 负责处理登录新账户（备份并重启）操作
 */
export function useAntigravityProcess(): UseAntigravityProcessResult {
    const [isProcessLoading, setIsProcessLoading] = useState(false);

    /**
     * 备份并重启 Antigravity（登录新账户）
     * 注意：此函数只负责执行逻辑，确认对话框在组件中处理
     */
    const backupAndRestartAntigravity = useCallback(async () => {
        logger.info('用户确认登录新账户操作', {
            module: 'ProcessManager',
            action: 'login_new_account_start'
        });

        try {
            setIsProcessLoading(true);

            logger.info('开始备份当前用户并注销', {
                module: 'ProcessManager',
                action: 'backup_and_restart_start'
            });
          toast.loading('正在备份当前用户并注销...');

            logger.info('调用 AntigravityService 备份重启服务', {
                module: 'ProcessManager',
                action: 'call_service'
            });
          await AntigravityService.backupAndRestartAntigravity();

            logger.info('备份并重启操作完成，准备刷新界面', {
                module: 'ProcessManager',
                action: 'operation_complete'
            });

            // 延迟刷新以确保操作完成
            setTimeout(() => {
                logger.info('执行界面刷新', {
                    module: 'ProcessManager',
                    action: 'refresh_ui'
                });
            }, 1000);

        } catch (error) {
            logger.error('登录新账户操作失败', {
                module: 'ProcessManager',
                action: 'operation_failed',
                error: error instanceof Error ? error.message : String(error)
            });
            const errorMessage = error instanceof Error ? error.message : String(error);
          toast.error(errorMessage);
        } finally {
            setIsProcessLoading(false);
            logger.debug('操作流程结束，重置加载状态', {
                module: 'ProcessManager',
                action: 'reset_loading_state'
            });
        }
    }, []);

    return {
        isProcessLoading,
        backupAndRestartAntigravity
    };
}
