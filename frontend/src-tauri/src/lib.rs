use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager, WebviewWindowBuilder, WebviewUrl, Listener};

#[derive(Serialize, Deserialize, Clone, Debug)]
struct PetState {
    label: String,
    x: f64,
    y: f64,
    visible: bool,
}

#[derive(Serialize, Deserialize, Default, Clone, Debug)]
struct AppConfig {
    pets: Vec<PetState>,
}

const CONFIG_FILENAME: &str = "frog_config.json";

fn get_config_path(app: &AppHandle) -> PathBuf {
    app.path().app_data_dir().unwrap().join(CONFIG_FILENAME)
}

fn load_config(app: &AppHandle) -> AppConfig {
    let config_path = get_config_path(app);
    if config_path.exists() {
        if let Ok(content) = fs::read_to_string(config_path) {
            if let Ok(config) = serde_json::from_str(&content) {
                return config;
            }
        }
    }
    AppConfig::default()
}

fn save_config(app: &AppHandle, config: &AppConfig) {
    let config_path = get_config_path(app);
    if let Some(parent) = config_path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    let _ = fs::write(config_path, serde_json::to_string_pretty(config).unwrap());
}

#[tauri::command]
async fn spawn_new_pet(app: AppHandle) -> Result<(), String> {
    let label = format!("frog-{}", uuid::Uuid::new_v4());
    create_pet_window(&app, &label, 200.0, 200.0).map_err(|e| e.to_string())
}

#[tauri::command]
async fn save_app_state(app: AppHandle) -> Result<(), String> {
    let mut pets = Vec::new();
    for window in app.webview_windows().values() {
        if window.label().starts_with("frog") {
            if let Ok(position) = window.outer_position() {
                 let scale_factor = window.scale_factor().unwrap_or(1.0);
                 let logical_pos = position.to_logical::<f64>(scale_factor);
                pets.push(PetState {
                    label: window.label().to_string(),
                    x: logical_pos.x,
                    y: logical_pos.y,
                    visible: window.is_visible().unwrap_or(true),
                });
            }
        }
    }
    save_config(&app, &AppConfig { pets });
    Ok(())
}

fn create_pet_window(app: &AppHandle, label: &str, x: f64, y: f64) -> tauri::Result<()> {
    // If window already exists, ignore
    if app.get_webview_window(label).is_some() {
        return Ok(());
    }

    let win_builder = WebviewWindowBuilder::new(app, label, WebviewUrl::App("index.html".into()))
        .title("ZetaFrog")
        .inner_size(200.0, 200.0)
        .resizable(false)
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .skip_taskbar(true)
        .focused(true);

    let window = win_builder.build()?;
    window.set_position(tauri::Position::Logical(tauri::LogicalPosition::new(x, y)))?;
    
    // Setup move listener to auto-save
    let _app_handle = app.clone();
    window.on_window_event(move |event| {
        if let tauri::WindowEvent::Moved(_) = event {
             // In a real app, debounce this
             // For now, we can rely on manual save or explicit save on exit
        }
    });

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .invoke_handler(tauri::generate_handler![spawn_new_pet, save_app_state])
    .setup(|app| {
        #[cfg(debug_assertions)]
        {
            app.handle().plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
            )?;
        }

        // Initialize Tray
        let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
        let show_i = MenuItem::with_id(app, "show", "Show/Hide All", true, None::<&str>)?;
        let new_frog_i = MenuItem::with_id(app, "new_frog", "New Frog", true, None::<&str>)?;
        
        let menu = Menu::with_items(app, &[&show_i, &new_frog_i, &quit_i])?;

        let _tray = TrayIconBuilder::with_id("tray")
            .menu(&menu)
            .show_menu_on_left_click(false)
            .icon(app.default_window_icon().unwrap().clone())
            .on_menu_event(|app, event| match event.id.as_ref() {
                "quit" => {
                    // Save before quit
                    let _ = tauri::async_runtime::block_on(save_app_state(app.clone()));
                    app.exit(0);
                }
                "show" => {
                    for window in app.webview_windows().values() {
                        if window.label().starts_with("frog") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                }
                "new_frog" => {
                    let _ = tauri::async_runtime::block_on(spawn_new_pet(app.clone()));
                }
                _ => {}
            })
            .on_tray_icon_event(|tray, event| match event {
                TrayIconEvent::Click {
                    button: tauri::tray::MouseButton::Left,
                    ..
                } => {
                    let app = tray.app_handle();
                     for window in app.webview_windows().values() {
                        if window.label().starts_with("frog") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                }
                _ => {}
            })
            .build(app)?;

        // Load config and spawn pets
        let config = load_config(app.handle());
        if config.pets.is_empty() {
            // First run, spawn default
            create_pet_window(app.handle(), "frog-main", 200.0, 200.0)?;
        } else {
            for pet in config.pets {
                create_pet_window(app.handle(), &pet.label, pet.x, pet.y)?;
            }
        }

        Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
