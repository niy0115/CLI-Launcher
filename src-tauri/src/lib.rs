use std::process::Command;
use std::os::windows::process::CommandExt; // 引入 Windows 擴充功能
use std::path::Path;
use tauri::Manager;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{TrayIconBuilder, TrayIconEvent};

const CREATE_NEW_CONSOLE: u32 = 0x00000010;

#[tauri::command]
fn launch_cli(tool: String, path: String) -> Result<(), String> {
    // 檢查路徑是否存在
    if !Path::new(&path).exists() {
        return Err(format!("路徑不存在: {}", path));
    }

    // 準備 PowerShell 指令
    // escape single quotes for PowerShell
    let safe_path = path.replace('\'', "''");
    
    // 組裝指令：先 Set-Location 到指定路徑，再執行工具
    let ps_cmd = format!("Set-Location -LiteralPath '{}'; {}", safe_path, tool);

    // 直接啟動 pwsh
    // 使用 CREATE_NEW_CONSOLE 旗標強制分離視窗
    Command::new("pwsh")
        .args(["-NoExit", "-Command", &ps_cmd])
        .creation_flags(CREATE_NEW_CONSOLE)
        .spawn()
        .map_err(|e| format!("Failed to launch pwsh: {}", e))?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        // 移除 Global Shortcut，改用 Tray
        .setup(|app| {
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Show/Hide", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            let _tray = TrayIconBuilder::with_id("tray")
                .menu(&menu)
                .icon(app.default_window_icon().unwrap().clone())
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| match event {
                    TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        ..
                    } => {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            // 左鍵點擊：強制召喚 (避免雙重觸發導致閃退)
                            let _ = window.unminimize();
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![launch_cli])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}