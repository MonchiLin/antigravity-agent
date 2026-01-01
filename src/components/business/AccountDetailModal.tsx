import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Copy, Key, User } from 'lucide-react';
import type { AntigravityAccount } from '@/commands/types/account.types';
import { BaseButton } from '@/components/base-ui/BaseButton';
import { cn } from '@/lib/utils.ts';
import { logger } from '@/lib/logger.ts';
import { Modal } from "antd";
import { AccountSessionListAccountItem } from "@/components/business/AccountSessionList.tsx";
import { Avatar } from "@/components/ui/avatar.tsx";

interface BusinessUserDetailProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  account: AccountSessionListAccountItem | null;
}

const BusinessUserDetail: React.FC<BusinessUserDetailProps> = ({
  isOpen,
  onOpenChange,
  account
}) => {
  const { t } = useTranslation(['account', 'common']);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // 复制到剪贴板功能
  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(account[fieldName]);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      logger.error('复制失败', {
        module: 'UserDetail',
        action: 'copy_failed',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  const InfoItem = ({
    icon,
    label,
    value,
    copyable = false,
    fieldName = '',
    isMultiline = false
  }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    copyable?: boolean;
    copyText?: string;
    fieldName?: string;
    isMultiline?: boolean;
  }) => (
    <div className="group">
      <label className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1.5 px-1 flex items-center gap-2">
        {icon}
        <span>{label}</span>
      </label>
      <div className="relative">
        <div className={cn(
          "bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md px-3 py-2 text-sm text-gray-600 dark:text-gray-400 break-all select-all transition-colors group-hover:border-gray-300 dark:group-hover:border-gray-700",
          isMultiline ? "min-h-[60px] whitespace-pre-wrap font-mono" : "font-mono"
        )}>
          {value || t('common:status.notSet')}
        </div>
        {copyable && value && (
          <BaseButton
            variant="ghost"
            size="icon"
            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => copyToClipboard(value, fieldName)}
            title={t('common:actions.copy')}
          >
            {copiedField === fieldName ? (
              <Check className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-gray-500" />
            )}
          </BaseButton>
        )}
      </div>
    </div>
  );

  if (!account) return null;

  return (
    <Modal
      footer={null}
      open={isOpen}
      onCancel={() => onOpenChange(false)}
    >
      {<div className={"flex flex-row items-center gap-0.5"}>
        <User className="h-4 w-4 text-gray-500" />
        <span>{t('accountDetail.title')}</span>
      </div>}
      <div className="p-5 space-y-6 max-h-[70vh] overflow-y-auto">
        {/* 用户头像和基本信息 */}
        <div className="flex items-center gap-4">
          <Avatar src={account.userAvatar} alt={account.nickName} />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {account.nickName}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {account.email}
            </p>
          </div>
        </div>

        <div className="h-px bg-gray-100 dark:bg-gray-800" />

        <InfoItem
          icon={<Key className="h-4 w-4 text-orange-500" />}
          label={t('accountDetail.apiKey')}
          value={"****"}
          copyable
          fieldName="apiKey"
        />
      </div>
    </Modal>
  );
};

export default BusinessUserDetail;
