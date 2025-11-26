import React from 'react';
import * as Switch from '@radix-ui/react-switch';
import toast from 'react-hot-toast';

interface SystemTraySwitchProps {
  checked: boolean;
  onCheckedChange: () => void;
  disabled?: boolean;
}

/**
 * 系统托盘开关组件
 *
 * 纯UI组件，所有的业务逻辑都由 useSystemTray hook 处理
 * 当启用时，关闭按钮会变成最小化到系统托盘
 * 当禁用时，恢复正常关闭行为
 */
const SystemTraySwitch: React.FC<SystemTraySwitchProps> = ({
  checked,
  onCheckedChange,
                                                             disabled = false
}) => {
  const [isChanging, setIsChanging] = React.useState(false);

  const handleCheckedChange = async () => {
    if (isChanging || disabled) {
      return;
    }

    setIsChanging(true);

    try {
      // 直接调用父组件提供的处理函数，所有业务逻辑都在那里处理
      await onCheckedChange();
    } catch (error) {
      toast.error('操作失败，请重试');
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        系统托盘
      </span>

      <Switch.Root
        className="SwitchRoot"
        checked={checked}
        onCheckedChange={handleCheckedChange}
        disabled={disabled || isChanging}
      >
        <Switch.Thumb className="SwitchThumb" />
      </Switch.Root>

      <style>{`
        .SwitchRoot {
          width: 42px;
          height: 24px;
          background-color: ${checked ? '#3b82f6' : '#e5e7eb'};
          border-radius: 9999px;
          position: relative;
          transition: all 100ms ease;
          cursor: pointer;
          border: none;
          outline: none;
        }

        .SwitchRoot:hover {
          background-color: ${checked ? '#2563eb' : '#d1d5db'};
        }

        .SwitchRoot:focus-visible {
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
        }

        .SwitchRoot:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .SwitchThumb {
          display: block;
          width: 18px;
          height: 18px;
          background-color: white;
          border-radius: 9999px;
          transition: transform 100ms ease;
          transform: ${checked ? 'translateX(18px)' : 'translateX(2px)'};
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
};

export default SystemTraySwitch;
