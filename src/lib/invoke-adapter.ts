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

/**
 * HTTP 调用实现
 * 将 Tauri 命令映射到 HTTP 路由
 */
async function httpInvoke<T>(cmd: string, args?: Record<string, any>): Promise<T> {
  let url = '';
  let method = 'GET';
  let body: any = undefined;

  // 简单的路由映射表
  switch (cmd) {
    case 'get_antigravity_accounts':
      url = `${SERVER_URL}/accounts`;
      method = 'GET';
      break;
    case 'switch_to_antigravity_account':
      url = `${SERVER_URL}/account/switch`;
      method = 'POST';
      // 注意：Tauri 的参数通常是平铺的，而我们的 API 可能期望一个对象
      // switch_account API 期望 { email: string }
      // Tauri command switch_to_antigravity_account(account_name: String)
      // 所以我们需要做字段映射
      body = { email: args?.account_name };
      break;
    case 'is_antigravity_running':
       // 这是一个简单的 GET，但服务器如果有对应的 /status 也可以
       url = `${SERVER_URL}/status`;
       break;
    default:
      console.warn(`Command "${cmd}" is not supported via HTTP yet.`);
      throw new Error(`Command "${cmd}" not supported via HTTP`);
  }

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
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
