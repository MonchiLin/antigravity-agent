import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { universalInvoke } from '@/lib/invoke-adapter';
import { Modal } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

// TODO: 替换为实际的 Antigravity 插件 ID
const TARGET_EXTENSION_NAMESPACE = 'MonchiLin';
const TARGET_EXTENSION_NAME = 'antigravity-agent';
const TARGET_EXTENSION_ID = `${TARGET_EXTENSION_NAMESPACE}.${TARGET_EXTENSION_NAME}`;
const MANUAL_DOWNLOAD_PAGE = `https://open-vsx.org/extension/${TARGET_EXTENSION_NAMESPACE}/${TARGET_EXTENSION_NAME}`;

interface UseInstallExtensionResult {
    install: () => Promise<void>;
    isInstalling: boolean;
}

export const useInstallExtension = (): UseInstallExtensionResult => {
    const { t } = useTranslation('settings');
    const [isInstalling, setIsInstalling] = useState(false);

    const install = async () => {
        if (isInstalling) return;

        setIsInstalling(true);
        const toastId = toast.loading(t('extension.fetchingInfo'));

        try {
            // 1. 获取 Open VSX 版本信息
            const apiUrl = `https://open-vsx.org/api/${TARGET_EXTENSION_NAMESPACE}/${TARGET_EXTENSION_NAME}`;
            const response = await fetch(apiUrl);

            if (!response.ok) {
                throw new Error(t('extension.fetchFailed', { status: response.statusText }));
            }

            const data = await response.json();
            const version = data.version;

            if (!version) {
                throw new Error(t('extension.parseVersionFailed'));
            }

            // 2. 构造下载链接
            const downloadUrl = `https://open-vsx.org/api/${TARGET_EXTENSION_NAMESPACE}/${TARGET_EXTENSION_NAME}/${version}/file/${TARGET_EXTENSION_NAMESPACE}.${TARGET_EXTENSION_NAME}-${version}.vsix`;

            toast.loading(t('extension.downloading', { id: TARGET_EXTENSION_ID, version }), { id: toastId });

            // 3. 调用后端命令
            const result = await universalInvoke<string>('launch_and_install_extension', { url: downloadUrl });

            toast.success(result, { id: toastId });

        } catch (error: any) {
            console.error('Install failed:', error);
            const msg = error.message || String(error);
            toast.error(t('extension.installFailed'), { id: toastId });

            // 弹出错误对话框，引导手动下载
            Modal.error({
                title: t('extension.installFailedTitle'),
                content: (
                    <div className="flex flex-col gap-2">
                        <p>{t('extension.installFailedError', { error: msg })}</p>
                        <p>{t('extension.installFailedManual')}</p>
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
                okText: t('extension.okButton'),
                centered: true,
                maskClosable: true,
            });

        } finally {
            setIsInstalling(false);
        }
    };

    return { install, isInstalling };
};

