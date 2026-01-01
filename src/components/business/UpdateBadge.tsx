import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUpdateChecker } from '@/hooks/use-update-checker.ts';
import toast from 'react-hot-toast';
import { logger } from '@/lib/logger.ts';
import BusinessUpdateDialog from '@/components/business/UpdateDialog.tsx';
import { cn } from '@/lib/utils.ts';
import { AlertTriangle, Download, Loader2, RotateCw } from 'lucide-react';
import type { DownloadProgress, UpdateInfo, UpdateState } from '@/services/updateService.ts';
import { Tooltip } from "antd";

type BadgeVariant = 'secondary' | 'destructive' | 'success' | 'warning';

const badgeVariantClasses: Record<BadgeVariant, string> = {
  secondary: 'bg-gray-600 text-gray-100',
  destructive: 'bg-red-600 text-white',
  success: 'bg-green-600 text-white',
  warning: 'bg-yellow-600 text-white',
};

interface InlineBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant: BadgeVariant;
  children: React.ReactNode;
}

const InlineBadge: React.FC<InlineBadgeProps> = ({
  variant,
  className,
  children,
  ...props
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        badgeVariantClasses[variant],
        'px-2 py-0.5 text-xs',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};


/**
 * 更新徽章组件
 * 已内联徽章样式，避免依赖 BaseBadge
 * 保持原有功能不变
 */
export interface UpdateBadgeProps {
  state?: UpdateState;
  updateInfo?: UpdateInfo | null;
  progress?: DownloadProgress | null;
  error?: string | null;
  onClick?: () => void;
  autoCheck?: boolean;
  className?: string;
}

const UpdateBadge: React.FC<UpdateBadgeProps> = ({
  state,
  updateInfo: updateInfoOverride,
  progress: progressOverride,
  error: errorOverride,
  onClick,
  autoCheck = true,
  className,
}) => {
  const { t } = useTranslation('update');

  // 使用自动更新检查 Hook
  const {
    updateState: internalState,
    updateInfo: internalUpdateInfo,
    downloadProgress: internalDownloadProgress,
    error: internalError,
    startDownload,
    installAndRelaunch,
    dismissUpdate,
  } = useUpdateChecker(state == null ? autoCheck : false); // 受控时禁用自动检查

  const updateState = state ?? internalState;
  const updateInfo = updateInfoOverride ?? internalUpdateInfo;
  const downloadProgress = progressOverride ?? internalDownloadProgress;
  const updateError = errorOverride ?? internalError;

  // 更新对话框状态
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);

  // 处理更新徽章点击
  const handleUpdateBadgeClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    setIsUpdateDialogOpen(true);
  };

  // 处理开始下载
  const handleStartDownload = async () => {
    try {
      await startDownload();
      toast.success(t('toast.downloadComplete'));
    } catch (error) {
      // 只在控制台打印错误，不提示用户
      logger.error('下载失败', {
        module: 'AppDock',
        action: 'download_update_failed',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  // 处理安装并重启
  const handleInstallAndRelaunch = async () => {
    try {
      toast(t('toast.installing'));
      await installAndRelaunch();
      // 如果成功，应用会重启，这里的代码不会执行
    } catch (error) {
      // 只在控制台打印错误，不提示用户
      logger.error('安装失败', {
        module: 'AppDock',
        action: 'install_update_failed',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };


  if (updateState === 'no-update') {
    return null;
  }

  const badgeVariant: BadgeVariant = updateError
    ? 'destructive'
    : updateState === 'ready-to-install'
      ? 'success'
      : updateState === 'downloading'
        ? 'secondary'
        : 'warning';

  const badgeContent = (() => {
    switch (updateState) {
      case 'update-available':
        return (
          <>
            <Download className="h-3.5 w-3.5" />
            <span>{t('badge.available')}</span>
          </>
        );
      case 'downloading':
        return (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>{downloadProgress?.percentage ?? 0}%</span>
          </>
        );
      case 'ready-to-install':
        return (
          <>
            <RotateCw className="h-3.5 w-3.5" />
            <span>{t('badge.restart')}</span>
          </>
        );
      case 'error':
        return (
          <>
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>{t('badge.failed')}</span>
          </>
        );
      default:
        return (
          <>
            <Download className="h-3.5 w-3.5" />
            <span>{t('badge.default')}</span>
          </>
        );
    }
  })();

  const tooltipContent = updateError
    ? t('tooltip.failed', { error: updateError })
    : updateState === 'update-available' && updateInfo
      ? t('tooltip.available', { version: updateInfo.version })
      : updateState === 'downloading'
        ? t('tooltip.downloading', { percentage: downloadProgress?.percentage ?? 0 })
        : updateState === 'ready-to-install'
          ? t('tooltip.ready')
          : t('tooltip.check');

  return (
    <>
      {/* 更新徽章 */}
      <Tooltip title={tooltipContent}>
        <button
          type="button"
          onClick={handleUpdateBadgeClick}
          className={cn('ml-2 inline-flex cursor-pointer', className)}
          aria-label="Application update"
        >
          <InlineBadge
            variant={badgeVariant}
            className={cn(
              'gap-1.5 select-none',
              updateState === 'update-available' && !updateError && 'animate-pulse'
            )}
          >
            {badgeContent}
          </InlineBadge>
        </button>
      </Tooltip>

      {/* 更新对话框 */}
      <BusinessUpdateDialog
        isOpen={isUpdateDialogOpen}
        onClose={() => setIsUpdateDialogOpen(false)}
        state={updateState}
        updateInfo={updateInfo}
        progress={downloadProgress}
        error={updateError}
        onDownload={handleStartDownload}
        onInstall={handleInstallAndRelaunch}
        onDismiss={() => {
          dismissUpdate();
          setIsUpdateDialogOpen(false);
        }}
      />
    </>
  );

};

export default UpdateBadge;
