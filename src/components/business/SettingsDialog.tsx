import React, { useState, useEffect } from 'react';
import { Settings, FolderOpen, FileCode, Zap, Monitor, VolumeX, Check, AlertCircle, Info, X } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { getVersion } from '@tauri-apps/api/app';
import { AntigravityPathService } from '../../services/antigravity-path-service';
import {
  BaseDialog,
  BaseDialogContent,
  BaseDialogHeader,
  BaseDialogTitle,
} from '@/components/base-ui/BaseDialog';
import { BaseButton } from '@/components/base-ui/BaseButton';
import { BaseSpinner } from '@/components/base-ui/BaseSpinner';
import { SystemTrayService } from '../../services/system-tray-service';
import { SilentStartService } from '../../services/silent-start-service';
import { cn } from '@/utils/utils';

interface BusinessSettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const BusinessSettingsDialog: React.FC<BusinessSettingsDialogProps> = ({
  isOpen,
  onOpenChange
}) => {
  const [dataPath, setDataPath] = useState<string>('');
  const [execPath, setExecPath] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const [appVersion, setAppVersion] = useState<string>('');

  // 监控设置状态
  const [isDbMonitoringEnabled, setIsDbMonitoringEnabled] = useState(true);
  const [isSettingsLoading, setIsSettingsLoading] = useState(false);

  // 系统托盘状态
  const [isSystemTrayEnabled, setIsSystemTrayEnabled] = useState(true);
  const [isTrayLoading, setIsTrayLoading] = useState(false);

  // 静默启动状态
  const [isSilentStartEnabled, setIsSilentStartEnabled] = useState(false);
  const [isSilentStartLoading, setIsSilentStartLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCurrentPaths();
      loadCurrentSettings();
      loadSystemTraySettings();
      loadSilentStartSettings();
      loadAppVersion();
    }
  }, [isOpen]);

  const loadAppVersion = async () => {
    try {
      const version = await getVersion();
      setAppVersion(version);
    } catch (error) {
      console.error('获取版本号失败:', error);
    }
  };

  const loadCurrentPaths = async () => {
    setIsLoading(true);
    try {
      const paths = await AntigravityPathService.getCurrentPaths();
      let finalDataPath = paths.dataPath;
      let finalExecPath = paths.executablePath;

      if (!finalDataPath) {
        const detectedData = await AntigravityPathService.detectAntigravityPath();
        if (detectedData.found && detectedData.path) {
          finalDataPath = detectedData.path + ' (自动检测)';
        }
      }

      if (!finalExecPath) {
        const detectedExec = await AntigravityPathService.detectExecutable();
        if (detectedExec.found && detectedExec.path) {
          finalExecPath = detectedExec.path + ' (自动检测)';
        }
      }

      setDataPath(finalDataPath || '未设置');
      setExecPath(finalExecPath || '未设置');
    } catch (error) {
      console.error('加载路径失败:', error);
      setDataPath('加载失败');
      setExecPath('加载失败');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCurrentSettings = async () => {
    setIsSettingsLoading(true);
    try {
      const dbMonitoringEnabled = await invoke<boolean>('is_db_monitoring_enabled');
      setIsDbMonitoringEnabled(dbMonitoringEnabled);
    } catch (error) {
      console.error('加载设置失败:', error);
      setIsDbMonitoringEnabled(true);
    } finally {
      setIsSettingsLoading(false);
    }
  };

  const handleDbMonitoringToggle = async (enabled: boolean) => {
    try {
      const result = await invoke<string>('save_db_monitoring_state', { enabled });
      setIsDbMonitoringEnabled(enabled);
      showMessage(result, 'success');
    } catch (error) {
      showMessage(`设置失败: ${error}`, 'error');
    }
  };

  const loadSystemTraySettings = async () => {
    try {
      const trayEnabled = await SystemTrayService.getSystemTrayState();
      setIsSystemTrayEnabled(trayEnabled);
    } catch (error) {
      console.error('加载系统托盘设置失败:', error);
      setIsSystemTrayEnabled(false);
    }
  };

  const handleSystemTrayToggle = async () => {
    setIsTrayLoading(true);
    try {
      const result = await SystemTrayService.toggleSystemTray();
      setIsSystemTrayEnabled(result.enabled);
      showMessage(result.message, result.enabled ? 'success' : 'info');
    } catch (error) {
      showMessage(`系统托盘切换失败: ${error}`, 'error');
    } finally {
      setIsTrayLoading(false);
    }
  };

  const loadSilentStartSettings = async () => {
    try {
      const silentStartEnabled = await SilentStartService.getSilentStartState();
      setIsSilentStartEnabled(silentStartEnabled);
    } catch (error) {
      console.error('加载静默启动设置失败:', error);
      setIsSilentStartEnabled(false);
    }
  };

  const handleSilentStartToggle = async (enabled: boolean) => {
    setIsSilentStartLoading(true);
    try {
      const result = await SilentStartService.setSilentStartEnabled(enabled);
      setIsSilentStartEnabled(result.enabled);
      showMessage(result.message, result.enabled ? 'success' : 'info');
    } catch (error) {
      showMessage(`静默启动切换失败: ${error}`, 'error');
    } finally {
      setIsSilentStartLoading(false);
    }
  };

  const handleBrowseDataPath = async () => {
    try {
      const result = await open({
        directory: true,
        multiple: false,
        title: '选择 Antigravity 数据目录',
      });

      if (result && typeof result === 'string') {
        const valid = await AntigravityPathService.validatePath(result);
        if (valid) {
          await AntigravityPathService.savePath(result);
          setDataPath(result);
          showMessage('数据库路径已更新', 'success');
        } else {
          showMessage('无效的数据目录：未找到 state.vscdb 文件', 'warning');
        }
      }
    } catch (error) {
      showMessage(`选择失败: ${error}`, 'error');
    }
  };

  const handleBrowseExecPath = async () => {
    try {
      const result = await open({
        directory: false,
        multiple: false,
        title: '选择 Antigravity 可执行文件',
        filters: [
          { name: '可执行文件', extensions: ['exe', 'app', ''] },
          { name: '所有文件', extensions: ['*'] }
        ]
      });

      if (result && typeof result === 'string') {
        const valid = await AntigravityPathService.validateExecutable(result);
        if (valid) {
          await AntigravityPathService.saveExecutable(result);
          setExecPath(result);
          showMessage('可执行文件路径已更新', 'success');
        } else {
          showMessage('无效的可执行文件', 'warning');
        }
      }
    } catch (error) {
      showMessage(`选择失败: ${error}`, 'error');
    }
  };

  const showMessage = (msg: string, type: 'success' | 'error' | 'warning' | 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3000);
  };

  const getMessageIcon = () => {
    switch (messageType) {
      case 'success': return <Check className="h-3.5 w-3.5" />;
      case 'error': return <AlertCircle className="h-3.5 w-3.5" />;
      case 'warning': return <AlertCircle className="h-3.5 w-3.5" />;
      default: return <Info className="h-3.5 w-3.5" />;
    }
  };

  const getMessageColorClasses = () => {
    switch (messageType) {
      case 'success': return 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800';
      case 'error': return 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800';
      case 'warning': return 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800';
      default: return 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800';
    }
  };

  return (
    <BaseDialog open={isOpen} onOpenChange={onOpenChange}>
      <BaseDialogContent className="max-w-md p-0 overflow-hidden bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 shadow-2xl">
        <BaseDialogHeader className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
          <BaseDialogTitle className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Settings className="h-4 w-4 text-gray-500" />
            <span>设置</span>
            {appVersion && (
              <span className="ml-1 text-xs font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full font-normal">
                v{appVersion}
              </span>
            )}
          </BaseDialogTitle>
        </BaseDialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <BaseSpinner size="default" />
            <p className="text-gray-400 mt-3 text-xs">加载中...</p>
          </div>
        ) : (
          <div className="p-5 space-y-6">
            {/* 消息提示 - 浮动式 */}
            {message && (
              <div className={cn(
                "absolute top-16 left-1/2 -translate-x-1/2 z-10",
                "flex items-center gap-2 px-3 py-1.5 rounded-full shadow-lg border text-xs font-medium animate-in fade-in slide-in-from-top-2",
                getMessageColorClasses()
              )}>
                {getMessageIcon()}
                {message}
              </div>
            )}

            {/* 路径设置组 */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">路径配置</h3>

              <div className="space-y-3">
                <div className="group">
                  <label className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1.5 block px-1">数据库路径</label>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md px-3 py-2 text-xs font-mono text-gray-600 dark:text-gray-400 break-all select-all transition-colors group-hover:border-gray-300 dark:group-hover:border-gray-700">
                      {dataPath}
                    </div>
                    <BaseButton
                      variant="outline"
                      size="icon"
                      className="h-[34px] w-[34px] shrink-0 border-gray-200 dark:border-gray-800"
                      onClick={handleBrowseDataPath}
                      title="选择数据库路径"
                    >
                      <FolderOpen className="h-4 w-4 text-gray-500" />
                    </BaseButton>
                  </div>
                </div>

                <div className="group">
                  <label className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1.5 block px-1">可执行文件</label>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md px-3 py-2 text-xs font-mono text-gray-600 dark:text-gray-400 break-all select-all transition-colors group-hover:border-gray-300 dark:group-hover:border-gray-700">
                      {execPath}
                    </div>
                    <BaseButton
                      variant="outline"
                      size="icon"
                      className="h-[34px] w-[34px] shrink-0 border-gray-200 dark:border-gray-800"
                      onClick={handleBrowseExecPath}
                      title="选择可执行文件"
                    >
                      <FileCode className="h-4 w-4 text-gray-500" />
                    </BaseButton>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px bg-gray-100 dark:bg-gray-800" />

            {/* 功能开关组 */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">功能选项</h3>

              <div className="space-y-1">
                <SettingToggle
                  icon={<Zap className="h-4 w-4 text-amber-500" />}
                  title="智能监控"
                  description="自动检测数据库变化并同步"
                  checked={isDbMonitoringEnabled}
                  onChange={handleDbMonitoringToggle}
                  isLoading={isSettingsLoading}
                />

                <SettingToggle
                  icon={<Monitor className="h-4 w-4 text-blue-500" />}
                  title="系统托盘"
                  description="关闭窗口时最小化到托盘"
                  checked={isSystemTrayEnabled}
                  onChange={handleSystemTrayToggle}
                  isLoading={isTrayLoading}
                />

                <SettingToggle
                  icon={<VolumeX className="h-4 w-4 text-purple-500" />}
                  title="静默启动"
                  description="启动时自动隐藏主窗口"
                  checked={isSilentStartEnabled}
                  onChange={() => handleSilentStartToggle(!isSilentStartEnabled)}
                  isLoading={isSilentStartLoading}
                />
              </div>
            </div>
          </div>
        )}
      </BaseDialogContent>
    </BaseDialog>
  );
};

// 内部组件：设置开关项
const SettingToggle = ({
  icon,
  title,
  description,
  checked,
  onChange,
  isLoading
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  isLoading: boolean;
}) => (
  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors group cursor-pointer" onClick={() => !isLoading && onChange(!checked)}>
    <div className="flex items-center gap-3">
      <div className="p-2 bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-100 dark:border-gray-700 group-hover:border-gray-200 dark:group-hover:border-gray-600 transition-colors">
        {icon}
      </div>
      <div>
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{description}</div>
      </div>
    </div>

    <div className="relative">
      {isLoading ? (
        <div className="h-5 w-9 flex items-center justify-center">
          <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-gray-300 border-t-blue-600"></div>
        </div>
      ) : (
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          className={cn(
            "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2",
            checked ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"
          )}
        >
          <span
            className={cn(
              "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
              checked ? "translate-x-4" : "translate-x-0"
            )}
          />
        </button>
      )}
    </div>
  </div>
);

export default BusinessSettingsDialog;
