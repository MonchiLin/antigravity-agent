import React, { useCallback, useEffect, useState } from 'react';
import { useDevToolsShortcut } from './hooks/useDevToolsShortcut';
import { usePasswordDialog } from './hooks/use-password-dialog';
import { useUserManagement } from './modules/user-management/store';
import { DATABASE_EVENTS, useDbMonitoringStore } from './modules/db-monitoring-store';
import useConfigManager from './modules/config-management/useConfigStore';
import { useAntigravityProcess } from './hooks/use-antigravity-process';
import BusinessManageSection from './components/business/ManageSection';
import StatusNotification from './components/StatusNotification';
import Toolbar from './components/Toolbar';
import AntigravityPathDialog from './components/AntigravityPathDialog';
import BusinessSettingsDialog from './components/business/SettingsDialog';
import PasswordDialog from './components/PasswordDialog';
import { TooltipProvider } from './components/ui/tooltip';
import { AntigravityPathService } from './services/antigravity-path-service';
import { exit } from '@tauri-apps/plugin-process';

interface Status {
  message: string;
  isError: boolean;
}

/**
 * 统一应用组件
 * 整合启动流程和业务逻辑，消除重复代码
 */
function AppContent() {
  // ========== 应用状态 ==========
  const [status, setStatus] = useState<Status>({ message: '', isError: false });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDetecting, setIsDetecting] = useState(true);
  const [isPathDialogOpen, setIsPathDialogOpen] = useState(false);

  // ========== Hook 集成 ==========
  useDevToolsShortcut();

  // 状态提示
  const showStatus = useCallback((message: string, isError: boolean = false): void => {
    setStatus({ message, isError });
    setTimeout(() => setStatus({ message: '', isError: false }), 5000);
  }, []);

  // 密码对话框
  const {
    passwordDialog,
    showPasswordDialog,
    closePasswordDialog,
    handlePasswordDialogCancel
  } = usePasswordDialog(showStatus);

  // 用户管理
  const { addCurrentUser } = useUserManagement();

  // 监听数据库变化事件
  const { loadSettings, addListener } = useDbMonitoringStore();

  useEffect(() => {
    loadSettings()
    return addListener(DATABASE_EVENTS.DATA_CHANGED, addCurrentUser)
  }, []);

  // 配置管理
  const { isImporting, isExporting, hasUserData, isCheckingData, importConfig, exportConfig } = useConfigManager(
    showStatus,
    showPasswordDialog,
    closePasswordDialog,
    false   // isRefreshing = false
  );

  // 进程管理
  const { isProcessLoading, backupAndRestartAntigravity } = useAntigravityProcess(showStatus, () => { });

  // ========== 初始化启动流程 ==========
  const initializeApp = useCallback(async () => {
    try {
      console.log('🔍 开始检测 Antigravity 安装...');

      // 检测数据库路径和可执行文件
      const [pathInfo, execInfo] = await Promise.all([
        AntigravityPathService.detectAntigravityPath(),
        AntigravityPathService.detectExecutable()
      ]);

      const bothFound = pathInfo.found && execInfo.found;

      if (bothFound) {
        console.log('✅ Antigravity 检测成功');
        setIsDetecting(false);
      } else {
        console.log('⚠️ Antigravity 未找到，显示路径选择');
        setIsDetecting(false);
        setIsPathDialogOpen(true);
      }
    } catch (error) {
      console.error('启动检测失败:', error);
      setIsDetecting(false);
      setIsPathDialogOpen(true);
    }
  }, []);

  // 路径选择处理
  const handlePathSelected = useCallback(async () => {
    setIsPathDialogOpen(false);
    // 路径选择成功后，重新初始化
    await initializeApp();
  }, [initializeApp]);

  const handlePathDialogCancel = useCallback(async () => {
    try {
      await exit(0);
    } catch (error) {
      console.error('退出应用失败:', error);
    }
  }, []);

  // 组件启动时执行初始化
  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  // 合并 loading 状态
  const loadingState = {
    isProcessLoading,
    isImporting,
    isExporting
  };

  // ========== 渲染逻辑 ==========
  if (isDetecting) {
    return (
      <div
        className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 mx-auto mb-6 text-blue-500"></div>
          <h2 className="text-2xl font-semibold mb-2 text-gray-800 dark:text-gray-100">
            正在检测 Antigravity...
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            请稍候，正在查找 Antigravity 安装路径
          </p>
        </div>
      </div>
    );
  }

  if (isPathDialogOpen) {
    return <div
      className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <AntigravityPathDialog
        isOpen={true}
        onPathSelected={handlePathSelected}
        onCancel={handlePathDialogCancel}
      />
    </div>
      ;
  }

  return (
    <>
      <Toolbar
        onImport={importConfig}
        onExport={exportConfig}
        hasUserData={hasUserData}
        isCheckingData={isCheckingData}
        onBackupAndRestart={backupAndRestartAntigravity}
        loadingState={loadingState}
        showStatus={showStatus}
        onSettingsClick={() => setIsSettingsOpen(true)}
      />

      <div className="container">
        <BusinessManageSection
          showStatus={showStatus}
        />
      </div>

      <StatusNotification status={status} />

      <PasswordDialog
        isOpen={passwordDialog.isOpen}
        title={passwordDialog.title}
        description={passwordDialog.description}
        requireConfirmation={passwordDialog.requireConfirmation}
        onSubmit={passwordDialog.onSubmit}
        onCancel={handlePasswordDialogCancel}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            closePasswordDialog();
          }
        }}
        validatePassword={passwordDialog.validatePassword}
      />

      <BusinessSettingsDialog
        isOpen={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
      />
    </>
  );
}

/**
 * 统一应用组件
 * 整合启动流程和业务逻辑，消除重复代码
 */
function App() {
  return <TooltipProvider>
    <AppContent />
  </TooltipProvider>

}

export default App;
