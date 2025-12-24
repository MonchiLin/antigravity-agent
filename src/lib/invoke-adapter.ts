import { invoke } from '@tauri-apps/api/core';

// 检测是否在 VS Code 扩展环境中运行
// 我们可以通过检查是否存在 __TAURI__ 对象来判断，或者使用环境变量
// 假设 VS Code 扩展会注入一个特定的全局变量或者我们构建时设置 VITE_ENV
const isExtension = !('__TAURI_INTERNALS__' in window) && !('__TAURI__' in window); // 简单的启发式检查

// 本地服务器地址 (与 main.rs 中配置的一致)
const SERVER_URL = 'http://127.0.0.1:18888/api';

/**
 * 通用命令调用适配器
 * 如果在 Tauri 环境中，使用 Tauri IPC
 * 如果在 VS Code 扩展环境中，使用 HTTP 请求
 */
export async function universalInvoke<T>(cmd: string, args?: Record<string, any>): Promise<T> {
  if (isExtension) {
    return httpInvoke<T>(cmd, args);
  } else {
    return invoke<T>(cmd, args);
  }
}

// 需要 POST 方法的命令列表
const POST_COMMANDS = new Set([
  'switch_to_antigravity_account',
  'get_account_metrics',
]);

// 在 HTTP 模式下忽略的命令（返回 undefined）
const IGNORED_COMMANDS = new Set([
  'write_frontend_log',
  'open_log_directory',
  'get_log_directory_path',
  'write_text_file',
]);

/**
 * HTTP 调用实现
 * 直接使用命令名作为路由路径，参数透传
 */
async function httpInvoke<T>(cmd: string, args?: Record<string, any>): Promise<T> {
  // 处理忽略的命令
  if (IGNORED_COMMANDS.has(cmd)) {
    if (cmd === 'write_frontend_log') {
      console.log('[FrontendLog]', args?.logEntry);
    } else {
      console.warn(`[InvokeAdapter] Command "${cmd}" ignored in HTTP mode.`);
    }
    return undefined as unknown as T;
  }

  // 直接使用命令名作为路由
  const url = `${SERVER_URL}/${cmd}`;
  const method = POST_COMMANDS.has(cmd) ? 'POST' : 'GET';

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // POST 请求透传参数
  if (method === 'POST' && args) {
    options.body = JSON.stringify(args);
  }

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP Error ${response.status}: ${errorText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`HTTP Invoke failed for ${cmd}:`, error);
    throw error;
  }
}
