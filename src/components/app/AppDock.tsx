import React, { useCallback, useState } from 'react';
import { ArrowBigDownDash, ArrowBigUpDash, Settings, UserRoundPlus, Rocket } from 'lucide-react';
import { useAntigravityAccount } from '@/modules/use-antigravity-account.ts';
import toast from 'react-hot-toast';
import { useImportExportAccount } from "@/modules/use-import-export-accounts.ts";
import { ImportPasswordDialog } from "@/components/ImportPasswordDialog.tsx";
import ExportPasswordDialog from "@/components/ExportPasswordDialog.tsx";
import BusinessSettingsDialog from "@/components/business/SettingsDialog.tsx";
import { Modal } from 'antd';
import { useSignInNewAntigravityAccount } from "@/hooks/use-sign-in-new-antigravity-account.ts";
import { Dock, DockIcon } from "@/components/ui/dock";
import { AnimatedTooltip } from "@/components/ui/animated-tooltip.tsx";
import { useInstallExtension } from "@/hooks/use-install-extension.tsx";
import { useTranslation } from 'react-i18next';

const { confirm } = Modal;

const AppDock = () => {
  const { t } = useTranslation(['dashboard', 'account', 'notifications']);

  // ========== 应用状态 ==========
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { install, isInstalling } = useInstallExtension();

  // Use selector to prevent infinite render loops
  const insertOrUpdateCurrentAccount = useAntigravityAccount((state) => state.insertOrUpdateCurrentAccount);
  const getAccounts = useAntigravityAccount((state) => state.getAccounts);
  const importExportAccount = useImportExportAccount();
  // 使用单独的选择器避免无限循环
  const isImporting = useImportExportAccount((state) => state.isImporting);
  const isExporting = useImportExportAccount((state) => state.isExporting);
  const isCheckingData = useImportExportAccount((state) => state.isCheckingData);
  const importDialogIsOpen = useImportExportAccount((state) => state.importDialogIsOpen);
  const exportDialogIsOpen = useImportExportAccount((state) => state.exportDialogIsOpen);

  // 处理导入对话框取消
  const handleImportDialogCancel = useCallback(() => {
    importExportAccount.closeImportDialog();
    toast.error(t('notifications:operationCancelled'));
  }, [importExportAccount, t]);

  // 处理导出对话框取消
  const handleExportDialogCancel = useCallback(() => {
    importExportAccount.closeExportDialog();
    toast.error(t('notifications:operationCancelled'));
  }, [importExportAccount, t]);

  // 包装方法以刷新用户列表
  const handleImportConfig = () => {
    importExportAccount.importConfig()
  };
  const handleExportConfig = () => importExportAccount.exportConfig();

  // 进程管理
  const signInNewAntigravityAccount = useSignInNewAntigravityAccount();

  // 计算全局加载状态
  const isAnyLoading = signInNewAntigravityAccount.processing || isImporting || isExporting;

  // 处理登录新账户按钮点击
  const handleBackupAndRestartClick = () => {
    confirm({
      centered: true,
      title: t('account:loginNew.title'),
      content: (
        <div className="wrap-break-word">
          <p>{t('account:loginNew.confirmMessage')}</p>
          <br />
          <p>{t('account:loginNew.details')}</p>
          <p>1. {t('account:loginNew.step1')}</p>
          <p>2. {t('account:loginNew.step2')}</p>
          <p>3. {t('account:loginNew.step3')}</p>
          <br />
          <p>{t('account:loginNew.warning')}</p>
        </div>
      ),
      onOk() {
        signInNewAntigravityAccount.run();
      },
      onCancel() {
      },
    });
  };

  const handleSubmitImportPassword = (password: string) => {
    importExportAccount.submitImportPassword(password)
      .then(() => {
        getAccounts()
      })
  };

  return (
    <>
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40">
        <Dock>
          <DockIcon onClick={install}>
            <AnimatedTooltip text={isInstalling ? "正在安装..." : "安装 Antigravity Agent 扩展"}>
              <Rocket className={`size-6 ${isInstalling ? 'animate-pulse text-blue-500' : ''}`} />
            </AnimatedTooltip>
          </DockIcon>
          <DockIcon onClick={handleBackupAndRestartClick}>
            <AnimatedTooltip text={t('dashboard:actions.loginNew')}>
              <UserRoundPlus className="size-6" />
            </AnimatedTooltip>
          </DockIcon>
          <DockIcon onClick={handleImportConfig}>
            <AnimatedTooltip text={t('dashboard:actions.import')}>
              <ArrowBigUpDash className="size-6" />
            </AnimatedTooltip>
          </DockIcon>
          <DockIcon onClick={handleExportConfig}>
            <AnimatedTooltip text={t('dashboard:actions.exportAll')}>
              <ArrowBigDownDash className="size-6" />
            </AnimatedTooltip>
          </DockIcon>
          <DockIcon onClick={() => setIsSettingsOpen(true)}>
            <AnimatedTooltip text={t('dashboard:actions.preferences')}>
              <Settings className="size-6" />
            </AnimatedTooltip>
          </DockIcon>
        </Dock>
      </div>

      <ImportPasswordDialog
        isOpen={importDialogIsOpen}
        onSubmit={handleSubmitImportPassword}
        onCancel={handleImportDialogCancel}
        onOpenChange={(open) => !open && importExportAccount.closeImportDialog()}
      />

      <ExportPasswordDialog
        isOpen={exportDialogIsOpen}
        onSubmit={importExportAccount.submitExportPassword}
        onCancel={handleExportDialogCancel}
        onOpenChange={(open) => !open && importExportAccount.closeExportDialog()}
      />

      <BusinessSettingsDialog
        isOpen={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
      />
    </>
  );
};

export default AppDock;
