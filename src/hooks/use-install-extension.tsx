import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { universalInvoke } from '@/lib/invoke-adapter';
import { Modal } from 'antd';
import React from 'react';

// TODO: 替换为实际的 Antigravity 插件 ID
const TARGET_EXTENSION_NAMESPACE = 'MonchiLin';
const TARGET_EXTENSION_NAME = 'antigravity-vscode';
const TARGET_EXTENSION_ID = `${TARGET_EXTENSION_NAMESPACE}.${TARGET_EXTENSION_NAME}`;
const MANUAL_DOWNLOAD_PAGE = `https://open-vsx.org/extension/${TARGET_EXTENSION_NAMESPACE}/${TARGET_EXTENSION_NAME}`;

interface UseInstallExtensionResult {
    install: () => Promise<void>;
    isInstalling: boolean;
}

export const useInstallExtension = (): UseInstallExtensionResult => {
    const [isInstalling, setIsInstalling] = useState(false);

    const install = async () => {
        if (isInstalling) return;

        setIsInstalling(true);
        const toastId = toast.loading('正在获取插件信息...');

        try {
            // 1. 获取 Open VSX 版本信息
            const apiUrl = `https://open-vsx.org/api/${TARGET_EXTENSION_NAMESPACE}/${TARGET_EXTENSION_NAME}`;
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                throw new Error(`无法获取插件信息: ${response.statusText}`);
            }
            
            const data = await response.json();
            const version = data.version;

            if (!version) {
                 throw new Error('无法解析插件版本号');
            }

            // 2. 构造下载链接
            const downloadUrl = `https://open-vsx.org/api/${TARGET_EXTENSION_NAMESPACE}/${TARGET_EXTENSION_NAME}/${version}/file/${TARGET_EXTENSION_NAMESPACE}.${TARGET_EXTENSION_NAME}-${version}.vsix`;
            
            toast.loading(`正在下载并安装 ${TARGET_EXTENSION_ID} v${version}...`, { id: toastId });

            // 3. 调用后端命令
            const result = await universalInvoke<string>('launch_and_install_extension', { url: downloadUrl });
            
            toast.success(result, { id: toastId });

        } catch (error: any) {
            console.error('Install failed:', error);
            const msg = error.message || String(error);
            toast.error(`安装失败`, { id: toastId });

            // 弹出错误对话框，引导手动下载
            Modal.error({
                title: '插件安装失败',
                content: (
                    <div className="flex flex-col gap-2">
                        <p>自动安装遇到错误：{msg}</p>
                        <p>您可以尝试手动下载并安装：</p>
                        <a 
                            href={MANUAL_DOWNLOAD_PAGE} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline break-all"
                        >
                            {MANUAL_DOWNLOAD_PAGE}
                        </a>
                    </div>
                ),
                okText: '好的',
                centered: true,
                maskClosable: true,
            });

        } finally {
            setIsInstalling(false);
        }
    };

    return { install, isInstalling };
};
