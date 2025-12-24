/**
 * Shim for @tauri-apps/plugin-http
 */
export const fetch = window.fetch.bind(window);
