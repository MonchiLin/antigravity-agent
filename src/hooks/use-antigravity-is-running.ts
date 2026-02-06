/**
 * Antigravity 进程运行状态 Store
 * 全局单例，每 5 秒自动检测 Antigravity 是否在运行
 */

import { create } from 'zustand';
import { ProcessCommands } from '@/commands/ProcessCommands';
import { logger } from '../lib/logger.ts';

// 状态接口
interface AntigravityIsRunningState {
  /** 是否正在运行 */
  isRunning: boolean | null;
  /** 是否正在检查 */
  isChecking: boolean;
  /** 最后检查时间 */
  lastChecked: Date | null;
}

// 操作接口
interface AntigravityIsRunningActions {
  /** 检查运行状态 */
  check: () => Promise<void>;
  /** 启动自动检查 */
  start: () => void;
  /** 停止自动检查 */
  stop: () => void;
  /** 添加状态变化监听器 */
  addStatusChangeListener: (listener: (isRunning: boolean) => void) => () => void;
}

// 监听器集合
const listeners = new Set<(isRunning: boolean) => void>();

// 全局定时器 ID
let checkIntervalId: NodeJS.Timeout | null = null;

// 检查间隔（5 秒）
const CHECK_INTERVAL = 5000;

/**
 * Antigravity 运行状态 Store
 */
export const useAntigravityIsRunning = create<
  AntigravityIsRunningState & AntigravityIsRunningActions
>((set, get) => ({
  // 初始状态
  isRunning: null,
  isChecking: false,
  lastChecked: null,

  // 检查运行状态
  check: async () => {
    // 防止并发检查
    if (get().isChecking) {
      return;
    }

    set({ isChecking: true });

    const prevIsRunning = get().isRunning;

    try {
      const running = await ProcessCommands.isRunning();
      set({
        isRunning: running,
        lastChecked: new Date(),
        isChecking: false,
      });

      // 仅当状态发生变化且不是首次初始化时触发监听器
      if (prevIsRunning !== null && prevIsRunning !== running) {
        listeners.forEach((listener) => listener(running));
      }
    } catch (error) {
      logger.error('检查状态失败', {
        module: 'AntigravityIsRunning',
        action: 'check_status_failed',
        error: error instanceof Error ? error.message : String(error)
      });
      // 检查失败时假设未运行
      const running = false;
      set({
        isRunning: running,
        lastChecked: new Date(),
        isChecking: false,
      });

      // 仅当状态发生变化且不是首次初始化时触发监听器
      if (prevIsRunning !== null && prevIsRunning !== running) {
        listeners.forEach((listener) => listener(running));
      }
    }
  },

  // 启动自动检查
  start: () => {
    // 清除已存在的定时器
    if (checkIntervalId !== null) {
      clearInterval(checkIntervalId);
    }

    // 立即检查一次
    get().check();

    // 启动定时检查
    checkIntervalId = setInterval(() => {
      get().check();
    }, CHECK_INTERVAL);

    logger.info('已启动自动检查', {
      module: 'AntigravityIsRunning',
      action: 'start_auto_check',
      interval: CHECK_INTERVAL
    });
  },

  stop: () => {
    if (checkIntervalId !== null) {
      clearInterval(checkIntervalId);
      checkIntervalId = null;
      logger.info('已停止自动检查', {
        module: 'AntigravityIsRunning',
        action: 'stop_auto_check'
      });
    }
  },

  // 添加状态变化监听器
  addStatusChangeListener: (listener: (isRunning: boolean) => void) => {
    listeners.add(listener);
    // 返回清理函数
    return () => {
      listeners.delete(listener);
    };
  },
}));
