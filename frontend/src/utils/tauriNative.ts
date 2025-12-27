/**
 * Tauri 原生窗口操作接口
 * 用于桌面宠物模式的点击穿透和窗口控制
 */

// 检查是否在 Tauri 环境中
export function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

/**
 * 设置窗口点击穿透状态
 * 
 * @param enabled - true 启用点击穿透（鼠标事件穿过窗口），false 禁用
 * @param windowLabel - 可选的窗口标签，默认为当前窗口
 */
export async function setClickThrough(
  enabled: boolean, 
  windowLabel?: string
): Promise<void> {
  if (!isTauriEnvironment()) {
    console.warn('Not in Tauri environment, click-through not available');
    return;
  }

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('set_click_through', { 
      windowLabel: windowLabel || null,
      enabled 
    });
    console.log(`Click-through ${enabled ? 'enabled' : 'disabled'}`);
  } catch (error) {
    console.error('Failed to set click-through:', error);
    throw error;
  }
}

/**
 * 检查当前平台是否支持点击穿透
 */
export async function checkClickThroughSupport(): Promise<boolean> {
  if (!isTauriEnvironment()) {
    return false;
  }

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<boolean>('is_click_through_supported');
  } catch (error) {
    console.error('Failed to check click-through support:', error);
    return false;
  }
}

/**
 * 生成新的宠物窗口
 */
export async function spawnNewPet(): Promise<void> {
  if (!isTauriEnvironment()) {
    console.warn('Not in Tauri environment');
    return;
  }

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('spawn_new_pet');
  } catch (error) {
    console.error('Failed to spawn new pet:', error);
    throw error;
  }
}

/**
 * 保存应用状态
 */
export async function saveAppState(): Promise<void> {
  if (!isTauriEnvironment()) {
    return;
  }

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('save_app_state');
  } catch (error) {
    console.error('Failed to save app state:', error);
  }
}
