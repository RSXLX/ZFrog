//! 原生窗口操作模块 - 实现点击穿透等桌面宠物功能
//! 
//! 支持平台:
//! - Windows: 使用 Win32 API (WS_EX_LAYERED, WS_EX_TRANSPARENT)
//! - macOS: 使用 NSWindow API (待实现)

use tauri::{AppHandle, Manager, Runtime};

/// Windows 平台的点击穿透实现
#[cfg(target_os = "windows")]
pub mod windows {
    use windows_sys::Win32::Foundation::HWND;
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        GetWindowLongW, SetWindowLongW, 
        GWL_EXSTYLE, WS_EX_LAYERED, WS_EX_TRANSPARENT
    };

    /// 设置窗口的点击穿透状态
    /// 
    /// # Arguments
    /// * `hwnd` - Windows 窗口句柄
    /// * `enabled` - true = 启用点击穿透, false = 禁用
    /// 
    /// # Safety
    /// 需要有效的 HWND
    pub unsafe fn set_click_through(hwnd: HWND, enabled: bool) -> bool {
        let ex_style = GetWindowLongW(hwnd, GWL_EXSTYLE);
        
        let new_style = if enabled {
            // 添加 LAYERED 和 TRANSPARENT 标志
            ex_style | WS_EX_LAYERED as i32 | WS_EX_TRANSPARENT as i32
        } else {
            // 移除 TRANSPARENT 标志，保留 LAYERED（用于透明度）
            (ex_style | WS_EX_LAYERED as i32) & !(WS_EX_TRANSPARENT as i32)
        };
        
        SetWindowLongW(hwnd, GWL_EXSTYLE, new_style) != 0
    }

    /// 获取窗口句柄
    pub fn get_hwnd<R: tauri::Runtime>(window: &tauri::WebviewWindow<R>) -> Option<HWND> {
        #[cfg(target_os = "windows")]
        {
            use tauri::WebviewWindow;
            // 获取 raw window handle
            match window.hwnd() {
                Ok(hwnd) => Some(hwnd.0 as HWND),
                Err(_) => None,
            }
        }
    }
}

/// macOS 平台的点击穿透实现 (占位)
#[cfg(target_os = "macos")]
pub mod macos {
    /// macOS 点击穿透实现需要使用 NSWindow API
    /// 目前为占位，功能待实现
    pub fn set_click_through(_window: &tauri::WebviewWindow, _enabled: bool) -> bool {
        // TODO: 使用 objc crate 调用 NSWindow setIgnoresMouseEvents:
        false
    }
}

/// 跨平台接口：设置窗口点击穿透
/// 
/// # Arguments
/// * `window` - Tauri 窗口引用
/// * `enabled` - true = 启用点击穿透, false = 禁用
pub fn set_window_click_through<R: tauri::Runtime>(
    window: &tauri::WebviewWindow<R>, 
    enabled: bool
) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        if let Some(hwnd) = windows::get_hwnd(window) {
            unsafe {
                if windows::set_click_through(hwnd, enabled) {
                    log::info!("点击穿透已{}: {}", if enabled { "启用" } else { "禁用" }, window.label());
                    return Ok(());
                }
            }
        }
        Err("无法获取窗口句柄".to_string())
    }
    
    #[cfg(target_os = "macos")]
    {
        if macos::set_click_through(window, enabled) {
            return Ok(());
        }
        Err("macOS 点击穿透暂未实现".to_string())
    }
    
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        Err("不支持的平台".to_string())
    }
}

/// 检查当前平台是否支持点击穿透
pub fn is_click_through_supported() -> bool {
    #[cfg(target_os = "windows")]
    { true }
    
    #[cfg(target_os = "macos")]
    { false } // 待实现
    
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    { false }
}
