import React, {useEffect, useState} from 'react';
import {EyeOff, FileCode, FolderOpen, Monitor, Settings, VolumeX} from 'lucide-react';
import {open} from '@tauri-apps/plugin-dialog';
import {getVersion} from '@tauri-apps/api/app';
import {BaseButton} from '@/components/base-ui/BaseButton';
import {cn} from '@/lib/utils.ts';
import {PlatformCommands} from "@/commands/PlatformCommands.ts";
import {Modal} from "antd";
import {useAppSettings} from "@/modules/use-app-settings.ts";
import {LoggingCommands} from "@/commands/LoggingCommands.ts";

interface BusinessSettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const BusinessSettingsDialog: React.FC<BusinessSettingsDialogProps> = ({
  isOpen,
  onOpenChange
}) => {
  const [execPath, setExecPath] = useState<string>('');
  const [logDirPath, setLogDirPath] = useState<string>('');
  const [appVersion, setAppVersion] = useState<string>('');

  
  // 应用设置（统一管理）
  const systemTrayEnabled = useAppSettings(state => state.systemTrayEnabled);
  const silentStartEnabled = useAppSettings(state => state.silentStartEnabled);
  const privateMode = useAppSettings(state => state.privateMode);

  const setSystemTrayEnabled = useAppSettings(state => state.setSystemTrayEnabled);
  const setSilentStartEnabled = useAppSettings(state => state.setSilentStartEnabled);
  const setPrivateMode = useAppSettings(state => state.setPrivateMode);

  const loading = useAppSettings(state => state.loading);

  useEffect(() => {
    if (isOpen) {
      loadCurrentPaths();
      loadLogDirectoryPath();
      loadAppVersion();
    }
  }, [isOpen]);

  const loadAppVersion = async () => {
    const version = await getVersion();
    setAppVersion(version);
  };

  const loadCurrentPaths = async () => {
    const paths = await PlatformCommands.getCurrentPaths();
    let finalExecPath = paths.executablePath;

    if (!finalExecPath) {
      const detectedExec = await PlatformCommands.detectExecutable();
      if (detectedExec.found && detectedExec.path) {
        finalExecPath = detectedExec.path + ' (自动检测)';
      }
    }

    setExecPath(finalExecPath || '未设置');
  };

  const loadLogDirectoryPath = async () => {
    try {
      const logPath = await LoggingCommands.getLogDirectoryPath();
      setLogDirPath(logPath || '未设置');
    } catch (_error) {
      setLogDirPath('未设置');
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
        const valid = await PlatformCommands.validateExecutable(result);
        if (valid) {
          await PlatformCommands.saveAntigravityExecutable(result);
          setExecPath(result);
        } else {
        }
      }
    } catch (error) {
    }
  };

  const handleOpenLogDirectory = async () => {
    await LoggingCommands.openLogDirectory();
  };

  return (
    <Modal
      open={isOpen}
      footer={null}
      onCancel={() => onOpenChange(false)}
      title={<div className={"flex flex-row items-center gap-1.5"}>
        <Settings className="h-4 w-4 text-gray-500"/>
        <span>设置</span>
        <span
          className="ml-1 text-xs font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full font-normal">
          v{appVersion}
        </span>
      </div>
      }
    >
      <div className="p-5 space-y-6">
        {/* 路径设置组 */}
        <div className="space-y-4">
          <div className="space-y-3">
            <PathSettingRow
              label="Antigravity 可执行文件"
              value={execPath}
              actionTitle="Antigravity 可执行文件"
              onAction={handleBrowseExecPath}
              actionIcon={<FileCode className="h-4 w-4 text-gray-500"/>}
            />

            <PathSettingRow
              label="日志目录"
              value={logDirPath}
              actionTitle="打开日志目录"
              onAction={handleOpenLogDirectory}
              actionIcon={<FolderOpen className="h-4 w-4 text-gray-500"/>}
            />
          </div>
        </div>

        <div className="h-px bg-gray-100 dark:bg-gray-800"/>

        <div className="space-y-1">
          <SettingToggle
            icon={<Monitor className="h-4 w-4 text-blue-500"/>}
            title="系统托盘"
            description="关闭窗口时最小化到托盘"
            checked={systemTrayEnabled}
            onChange={setSystemTrayEnabled}
            isLoading={loading.systemTray}
          />

          <SettingToggle
            icon={<VolumeX className="h-4 w-4 text-purple-500"/>}
            title="静默启动"
            description="启动时自动隐藏主窗口"
            checked={silentStartEnabled}
            onChange={setSilentStartEnabled}
            isLoading={loading.silentStart}
          />

          <SettingToggle
            icon={<EyeOff className="h-4 w-4 text-emerald-500"/>}
            title="隐私模式"
            description="在用户卡片中隐藏邮箱和昵称"
            checked={privateMode}
            onChange={setPrivateMode}
            isLoading={loading.privateMode}
          />
        </div>

        <div className="h-px bg-gray-100 dark:bg-gray-800"/>

        <div className="space-y-1">
          <a target={"_blank"} href={"https://github.com/MonchiLin/antigravity-agent/issues"}>遇到问题/请求新功能</a>
        </div>

      </div>
    </Modal>
  );
};

const PathSettingRow = ({
  label,
  value,
  actionTitle,
  onAction,
  actionIcon,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  actionTitle: string;
  onAction: () => void;
  actionIcon: React.ReactNode;
}) => (
  <div className="group">
    <label
      className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1.5 block px-1">
      {label}
    </label>
    <div className="flex gap-2">
      <div
        className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md px-3 py-2 text-xs font-mono text-gray-600 dark:text-gray-400 break-all select-all transition-colors group-hover:border-gray-300 dark:group-hover:border-gray-700">
        {value}
      </div>
      <BaseButton
        variant="outline"
        size="icon"
        className="h-[34px] w-[34px] shrink-0 border-gray-200 dark:border-gray-800"
        onClick={onAction}
        title={actionTitle}
      >
        {actionIcon}
      </BaseButton>
    </div>
  </div>
);

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
