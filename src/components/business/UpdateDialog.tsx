import React from 'react';
import { useTranslation } from 'react-i18next';
import { Download, RotateCw, AlertTriangle } from 'lucide-react';
import { UpdateState, UpdateInfo, DownloadProgress } from '../../services/updateService';
import { Modal } from 'antd';
import { BaseButton } from '@/components/base-ui/BaseButton';
import { BaseProgress } from '@/components/base-ui/BaseProgress';

interface BusinessUpdateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  state: UpdateState;
  updateInfo: UpdateInfo | null;
  progress: DownloadProgress | null;
  error: string | null;
  onDownload: () => void;
  onInstall: () => void;
  onDismiss: () => void;
}

const BusinessUpdateDialog: React.FC<BusinessUpdateDialogProps> = ({
  isOpen,
  onClose,
  state,
  updateInfo,
  progress,
  error,
  onDownload,
  onInstall,
  onDismiss,
}) => {
  const { t } = useTranslation(['update', 'common']);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const renderContent = () => {
    if (error) {
      return (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">
                {t('update:dialog.errorTitle')}
              </h4>
              <p className="text-sm text-red-700 dark:text-red-300">
                {error}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <BaseButton variant="outline" onClick={onClose}>
              {t('common:buttons.close')}
            </BaseButton>
          </div>
        </div>
      );
    }

    if (state === 'update-available' && updateInfo) {
      return (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">{t('update:dialog.currentVersion')}</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                v{updateInfo.currentVersion}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">{t('update:dialog.latestVersion')}</span>
              <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                v{updateInfo.version}
              </span>
            </div>
          </div>

          {updateInfo.body && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {t('update:dialog.releaseNotes')}
              </h4>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg max-h-48 overflow-y-auto">
                <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans">
                  {updateInfo.body}
                </pre>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <BaseButton variant="outline" onClick={onDismiss}>
              {t('update:dialog.ignore')}
            </BaseButton>
            <BaseButton variant="default" onClick={onDownload} leftIcon={<Download className="w-4 h-4" />}>
              {t('update:dialog.updateNow')}
            </BaseButton>
          </div>
        </div>
      );
    }

    if (state === 'downloading' && progress) {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">{t('update:dialog.downloadProgress')}</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {progress.percentage}%
              </span>
            </div>

            <BaseProgress value={progress.percentage} />

            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{formatFileSize(progress.downloaded)}</span>
              <span>{formatFileSize(progress.total)}</span>
            </div>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            {t('update:dialog.downloadingDesc')}
          </p>
        </div>
      );
    }

    if (state === 'ready-to-install') {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-center p-6 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 mx-auto bg-green-500 rounded-full flex items-center justify-center">
                <Download className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-lg font-semibold text-green-800 dark:text-green-200">
                {t('update:dialog.readyTitle')}
              </h4>
              <p className="text-sm text-green-700 dark:text-green-300">
                {t('update:dialog.readyDesc')}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <BaseButton variant="outline" onClick={onClose}>
              {t('update:dialog.restartLater')}
            </BaseButton>
            <BaseButton variant="default" onClick={onInstall} leftIcon={<RotateCw className="w-4 h-4" />}>
              {t('update:dialog.restartNow')}
            </BaseButton>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      title={
        <div className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Download className="w-5 h-5 text-blue-500" />
          {t('update:dialog.title')}
        </div>
      }
      footer={null}
    >
      <div className="mt-4">
        {renderContent()}
      </div>
    </Modal>
  );
};

export default BusinessUpdateDialog;
