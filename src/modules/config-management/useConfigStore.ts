/**
 * 配置管理 Store (完全集成版)
 * 直接使用 Zustand，集成所有配置管理逻辑，提供完整接口
 */

import { useEffect } from 'react';
import { create } from 'zustand';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { AntigravityService } from '../../services/antigravity-service';

// 内部类型定义 (不导出)
interface BackupData {
  filename: string;
  content: any;
  timestamp: number;
}

interface EncryptedConfigData {
  version: string;
  backupCount: number;
  backups: BackupData[];
}

export interface PasswordDialogConfig {
  title: string;
  description?: string;
  requireConfirmation?: boolean;
  onSubmit: (password: string) => void;
  validatePassword?: (password: string) => { isValid: boolean; message?: string };
}

// Store 状态
interface ConfigState {
  isImporting: boolean;
  isExporting: boolean;
  hasUserData: boolean;
  isCheckingData: boolean;
}

// Store 操作
interface ConfigActions {
  setImporting: (isImporting: boolean) => void;
  setExporting: (isExporting: boolean) => void;
  setHasUserData: (hasUserData: boolean) => void;
  setCheckingData: (isCheckingData: boolean) => void;
  checkUserData: () => Promise<void>;
  importConfig: (
    showStatus: (message: string, isError?: boolean) => void,
    showPasswordDialog: (config: PasswordDialogConfig) => void,
    closePasswordDialog: () => void
  ) => Promise<void>;
  exportConfig: (
    showStatus: (message: string, isError?: boolean) => void,
    showPasswordDialog: (config: PasswordDialogConfig) => void,
    closePasswordDialog: () => void
  ) => Promise<void>;
}

// 创建 Zustand Store
export const useConfigStore = create<ConfigState & ConfigActions>()(
  (set, get) => ({
    // 初始状态
    isImporting: false,
    isExporting: false,
    hasUserData: false,
    isCheckingData: false,

    // 状态设置方法
    setImporting: (isImporting: boolean) => set({ isImporting }),
    setExporting: (isExporting: boolean) => set({ isExporting }),
    setHasUserData: (hasUserData: boolean) => set({ hasUserData }),
    setCheckingData: (isCheckingData: boolean) => set({ isCheckingData }),

    // ============ 检查用户数据 ============
    checkUserData: async (): Promise<void> => {
      try {
        set({ isCheckingData: true });
        const backupList = await AntigravityService.getBackupList();
        set({ hasUserData: backupList.length > 0 });
        console.log('📋 [检查] 用户数据状态:', backupList.length > 0 ? '有数据' : '无数据');
      } catch (error) {
        console.error('❌ [检查] 检查用户数据失败:', error);
        set({ hasUserData: false });
      } finally {
        set({ isCheckingData: false });
      }
    },

    // ============ 导入配置 ============
    importConfig: async (
      showStatus: (message: string, isError?: boolean) => void,
      showPasswordDialog: (config: PasswordDialogConfig) => void,
      closePasswordDialog: () => void
    ): Promise<void> => {
      console.log('🔍 [导入] 开始导入配置文件');

      try {
        // 选择文件
        const selected = await open({
          title: '选择配置文件',
          filters: [
            {
              name: 'Antigravity 加密配置文件',
              extensions: ['enc']
            },
            {
              name: '所有文件',
              extensions: ['*']
            }
          ],
          multiple: false
        });

        if (!selected || typeof selected !== 'string') {
          console.log('❌ [导入] 未选择文件');
          showStatus('未选择文件', true);
          return;
        }

        console.log('📋 [导入] 选择文件:', selected);

        // 读取文件内容
        const fileContentUint8Array = await readFile(selected);
        const fileContent = new TextDecoder().decode(fileContentUint8Array);


        if (fileContent.length === 0) {
          console.log('❌ [导入] 文件内容为空');
          showStatus('文件内容为空', true);
          return;
        }

        // 使用密码对话框获取密码
        showPasswordDialog({
          title: '导入配置文件',
          description: '请输入配置文件的解密密码',
          requireConfirmation: false,
          validatePassword: (password: string) => {
            if (password.length < 4) return { isValid: false, message: '密码长度至少为4位' };
            if (password.length > 50) return { isValid: false, message: '密码长度不能超过50位' };
            return { isValid: true };
          },
          onSubmit: async (password) => {
            try {
              closePasswordDialog();
              set({ isImporting: true });
              showStatus('正在解密配置文件...');

              // 解密配置数据 - 使用后端解密
              const decryptedJson: string = await invoke('decrypt_config_data', {
                encryptedData: fileContent,
                password
              });
              const configData: EncryptedConfigData = JSON.parse(decryptedJson);

              // 验证配置数据格式
              if (!configData.version || !configData.backups || !Array.isArray(configData.backups)) {
                throw new Error('配置文件格式无效');
              }

              console.log('📋 [导入] 开始恢复备份数据...');
              showStatus('正在恢复账户数据...');

              // ✅ 调用后端恢复备份文件
              interface RestoreResult {
                restoredCount: number;  // 后端使用 #[serde(rename = "restoredCount")]
                failed: Array<{ filename: string; error: string }>;
              }
              const result = await invoke<RestoreResult>('restore_backup_files', {
                backups: configData.backups
              });

              if (result.failed.length > 0) {
                console.warn('⚠️ [导入] 部分文件恢复失败:', result.failed);
                showStatus(`配置文件导入成功，已恢复 ${result.restoredCount} 个账户，${result.failed.length} 个失败`);
              } else {
                console.log('✅ [导入] 所有文件恢复成功');
                showStatus(`配置文件导入成功，已恢复 ${result.restoredCount} 个账户`);
              }

            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              console.error('❌ [导入] 解密失败:', errorMessage);
              showStatus(`配置文件解密失败: ${errorMessage}`, true);
            } finally {
              set({ isImporting: false });
            }
          }
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('❌ [导入] 文件操作失败:', errorMessage);
        showStatus(`文件操作失败: ${errorMessage}`, true);
      }
    },

    // ============ 导出配置 ============
    exportConfig: async (
      showStatus: (message: string, isError?: boolean) => void,
      showPasswordDialog: (config: PasswordDialogConfig) => void,
      closePasswordDialog: () => void
    ): Promise<void> => {
      try {
        console.log('📋 [导出] 开始收集备份数据...');
        showStatus('正在收集账户数据...');

        // ✅ 获取包含完整内容的备份数据
        const backupsWithContent = await invoke<BackupData[]>('collect_backup_contents');

        if (backupsWithContent.length === 0) {
          showStatus('没有找到任何用户信息，无法导出配置文件', true);
          return;
        }

        console.log('📋 [导出] 找到备份数据:', backupsWithContent.length, '个');

        // 使用密码对话框获取密码
        showPasswordDialog({
          title: '导出配置文件',
          description: '请设置导出密码，用于保护您的配置文件',
          requireConfirmation: true,
          validatePassword: (password: string) => {
            if (password.length < 4) return { isValid: false, message: '密码长度至少为4位' };
            if (password.length > 50) return { isValid: false, message: '密码长度不能超过50位' };
            return { isValid: true };
          },
          onSubmit: async (password) => {
            try {
              closePasswordDialog();
              set({ isExporting: true });
              showStatus('正在生成加密配置文件...');

              // ✅ 构建配置数据（包含完整内容）
              const configData: EncryptedConfigData = {
                version: '1.1.0',
                backupCount: backupsWithContent.length,
                backups: backupsWithContent
              };

              // ✅ 调用后端加密命令（包含 JSON 序列化 + XOR 加密 + Base64 编码）
              const configJson = JSON.stringify(configData, null, 2);
              console.log('📋 [导出] 配置数据大小:', new Blob([configJson]).size, 'bytes');

              const encryptedData = await invoke<string>('encrypt_config_data', {
                jsonData: configJson,
                password
              });

              // 选择保存位置
              const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
              const defaultFileName = `antigravity_encrypted_config_${timestamp}.enc`;

              const savePath = await save({
                title: '保存配置文件',
                defaultPath: defaultFileName,
                filters: [
                  {
                    name: 'Antigravity 加密配置文件',
                    extensions: ['enc']
                  }
                ]
              });

              if (!savePath || typeof savePath !== 'string') {
                console.log('❌ [导出] 未选择保存位置');
                showStatus('未选择保存位置', true);
                return;
              }

              // 保存加密文件
              await invoke('write_text_file', {
                path: savePath,
                content: encryptedData
              });

              showStatus(`配置文件已保存: ${savePath}`);
              console.log('✅ [导出] 保存成功:', savePath);

            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              console.error('❌ [导出] 导出失败:', errorMessage);
              showStatus(`导出配置文件失败: ${errorMessage}`, true);
            } finally {
              set({ isExporting: false });
            }
          }
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('❌ [导出] 检查数据失败:', errorMessage);
        showStatus(`检查数据失败: ${errorMessage}`, true);
      }
    },
  })
);

/**
 * 配置管理 Hook
 * 提供与原 useConfigManager 相同的接口，但基于 useConfigStore
 */
export function useConfigManager(
  showStatus: (message: string, isError?: boolean) => void,
  showPasswordDialog: (config: PasswordDialogConfig) => void,
  closePasswordDialog: () => void,
  isRefreshing?: boolean
) {
  const {
    isImporting,
    isExporting,
    hasUserData,
    isCheckingData,
    importConfig,
    exportConfig,
    checkUserData,
  } = useConfigStore();

  // 组件挂载时检查用户数据
  useEffect(() => {
    checkUserData();
  }, [checkUserData]);

  // 当刷新操作完成后，重新检查用户数据
  useEffect(() => {
    if (!isRefreshing) {
      const timer = setTimeout(() => {
        checkUserData();
      }, 500); // 延迟500ms确保刷新完成
      return () => clearTimeout(timer);
    }
  }, [isRefreshing, checkUserData]);

  // 包装方法以传递必要的参数
  const handleImportConfig = () => importConfig(showStatus, showPasswordDialog, closePasswordDialog);
  const handleExportConfig = () => exportConfig(showStatus, showPasswordDialog, closePasswordDialog);

  return {
    isImporting,
    isExporting,
    hasUserData,
    isCheckingData,
    importConfig: handleImportConfig,
    exportConfig: handleExportConfig,
  };
}

// 默认导出
export default useConfigManager;
