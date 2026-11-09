// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, LogicalSize, Manager, PhysicalPosition, Size, WebviewWindow,
};

const AUTOSTART_REG_KEY: &str = r"HKCU\Software\Microsoft\Windows\CurrentVersion\Run";
const AUTOSTART_VALUE_NAME: &str = "ChronoSlabHUD";

static GHOST_MODE: AtomicBool = AtomicBool::new(false);
static GHOST_CHANGED_MS: AtomicU64 = AtomicU64::new(0);

fn current_epoch_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

#[cfg(target_os = "windows")]
#[repr(C)]
struct POINT {
    x: i32,
    y: i32,
}

#[cfg(target_os = "windows")]
extern "system" {
    fn GetAsyncKeyState(vkey: i32) -> i16;
    fn GetCursorPos(lpPoint: *mut POINT) -> i32;
    fn CreateMutexA(
        lpMutexAttributes: *mut std::ffi::c_void,
        bInitialOwner: i32,
        lpName: *const u8,
    ) -> *mut std::ffi::c_void;
    fn GetLastError() -> u32;
    fn FindWindowA(lpClassName: *const u8, lpWindowName: *const u8) -> *mut std::ffi::c_void;
    fn ShowWindow(hWnd: *mut std::ffi::c_void, nCmdShow: i32) -> i32;
    fn SetForegroundWindow(hWnd: *mut std::ffi::c_void) -> i32;
}

/// Prevent multiple instances of ChronoSlab 3D HUD from ever running simultaneously.
/// If an instance is already running, focus and reveal it before exiting.
#[cfg(target_os = "windows")]
fn enforce_single_instance() {
    const ERROR_ALREADY_EXISTS: u32 = 183;
    const SW_RESTORE: i32 = 9;
    unsafe {
        let mutex_name = b"Local\\ChronoSlab3DHudSingleInstanceMutex\0";
        let handle = CreateMutexA(std::ptr::null_mut(), 1, mutex_name.as_ptr());
        if !handle.is_null() && GetLastError() == ERROR_ALREADY_EXISTS {
            let win_title = b"ChronoSlab 3D HUD\0";
            let hwnd = FindWindowA(std::ptr::null(), win_title.as_ptr());
            if !hwnd.is_null() {
                ShowWindow(hwnd, SW_RESTORE);
                SetForegroundWindow(hwnd);
            }
            std::process::exit(0);
        }
    }
}

/// Remove legacy Startup folder VBS script so Windows doesn't launch both VBS + Registry Run
fn remove_duplicate_startup_vbs() {
    if let Ok(appdata) = std::env::var("APPDATA") {
        let vbs_path = PathBuf::from(appdata)
            .join("Microsoft")
            .join("Windows")
            .join("Start Menu")
            .join("Programs")
            .join("Startup")
            .join("ChronoSlab-HUD.vbs");
        if vbs_path.exists() {
            let _ = fs::remove_file(vbs_path);
        }
    }
}

fn get_state_file_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app_data_dir: {}", e))?;
    if !app_dir.exists() {
        fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    }
    Ok(app_dir.join("hud_state.json"))
}

#[cfg(target_os = "windows")]
fn get_taskbar_height(scale: f64) -> i32 {
    #[repr(C)]
    struct RECT {
        left: i32,
        top: i32,
        right: i32,
        bottom: i32,
    }
    extern "system" {
        fn SystemParametersInfoW(
            uiAction: u32,
            uiParam: u32,
            pvParam: *mut RECT,
            fWinIni: u32,
        ) -> i32;
        fn GetSystemMetrics(nIndex: i32) -> i32;
    }
    const SPI_GETWORKAREA: u32 = 0x0030;
    const SM_CYSCREEN: i32 = 1;

    let mut rect = RECT {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
    };
    unsafe {
        let screen_h = GetSystemMetrics(SM_CYSCREEN);
        if SystemParametersInfoW(SPI_GETWORKAREA, 0, &mut rect, 0) != 0
            && rect.bottom > 0
            && screen_h > rect.bottom
        {
            let diff = screen_h - rect.bottom;
            let logical_diff = (diff as f64 / scale).round() as i32;
            if logical_diff >= 32 && logical_diff <= 120 {
                return logical_diff;
            }
        }
    }
    // Fallback standard Windows 11 taskbar height (48px)
    48
}

#[cfg(not(target_os = "windows"))]
fn get_taskbar_height(_scale: f64) -> i32 {
    48
}

/// Position the native Tauri window at any screen border with continuous offset along the rail
fn position_window_at_edge(
    window: &WebviewWindow,
    edge: &str,
    offset_ratio: f64,
    win_w: f64,
    win_h: f64,
) {
    if let Ok(Some(monitor)) = window.current_monitor() {
        let screen_size = monitor.size();
        let screen_pos = monitor.position();
        let scale = monitor.scale_factor();

        let mon_w = (screen_size.width as f64 / scale) as i32;
        let mon_h = (screen_size.height as f64 / scale) as i32;
        let w = win_w as i32;
        let h = win_h as i32;

        let ratio = offset_ratio.max(0.0).min(1.0);
        let taskbar_h = get_taskbar_height(scale);

        let (mut x, mut y) = match edge {
            "bottom" => {
                let x_pos = if ratio <= 0.15 {
                    screen_pos.x
                } else if ratio >= 0.85 {
                    screen_pos.x + mon_w - w
                } else {
                    screen_pos.x + ((mon_w - w) as f64 * ratio) as i32
                };
                // Position directly above the Windows taskbar with a clean 4px clearance
                let y_pos = screen_pos.y + mon_h - h - taskbar_h - 4;
                (x_pos, y_pos)
            }
            "left" => {
                let x_pos = screen_pos.x;
                let available_h = mon_h - h - taskbar_h - 4;
                let y_pos = if ratio <= 0.15 {
                    screen_pos.y
                } else if ratio >= 0.85 {
                    screen_pos.y + available_h
                } else {
                    screen_pos.y + (available_h as f64 * ratio) as i32
                };
                (x_pos, y_pos)
            }
            "right" => {
                let x_pos = screen_pos.x + mon_w - w;
                let available_h = mon_h - h - taskbar_h - 4;
                let y_pos = if ratio <= 0.15 {
                    screen_pos.y
                } else if ratio >= 0.85 {
                    screen_pos.y + available_h
                } else {
                    screen_pos.y + (available_h as f64 * ratio) as i32
                };
                (x_pos, y_pos)
            }
            _ => {
                // "top" (default)
                let x_pos = if ratio <= 0.15 {
                    screen_pos.x
                } else if ratio >= 0.85 {
                    screen_pos.x + mon_w - w
                } else {
                    screen_pos.x + ((mon_w - w) as f64 * ratio) as i32
                };
                let y_pos = screen_pos.y;
                (x_pos, y_pos)
            }
        };

        let max_y = match edge {
            "bottom" => screen_pos.y + mon_h - h - taskbar_h,
            _ => screen_pos.y + mon_h - h,
        };

        x = x.max(screen_pos.x).min(screen_pos.x + mon_w - w);
        y = y.max(screen_pos.y).min(max_y);

        let _ = window.set_position(PhysicalPosition::new(
            (x as f64 * scale) as i32,
            (y as f64 * scale) as i32,
        ));
    }
}

/// Position the native Tauri window at the exact top-center of the current monitor
fn position_window_top_center(window: &WebviewWindow) {
    position_window_at_edge(window, "top", 0.5, 480.0, 84.0);
}

#[tauri::command]
fn center_window_top(window: WebviewWindow) -> Result<(), String> {
    position_window_top_center(&window);
    Ok(())
}

/// Dynamically resize the native frameless overlay window so it only covers the compact notch
/// when collapsed, allowing clicks to reach all underlying apps outside the notch.
#[tauri::command]
fn sync_window_bounds(
    window: WebviewWindow,
    expanded: bool,
    split_mode: bool,
    floating: bool,
    has_drawer: bool,
    always_on_top: Option<bool>,
    dock_edge: Option<String>,
    dock_offset_ratio: Option<f64>,
) -> Result<(), String> {
    let edge = dock_edge.unwrap_or_else(|| "top".to_string());
    let offset_ratio = dock_offset_ratio.unwrap_or(0.5).max(0.0).min(1.0);
    let is_vertical = edge == "left" || edge == "right";

    let (target_w, target_h) = if !expanded {
        if is_vertical {
            (84.0, 480.0)
        } else {
            (480.0, 84.0)
        }
    } else if split_mode {
        (920.0, 820.0)
    } else if has_drawer {
        if is_vertical {
            (520.0, 820.0)
        } else {
            (480.0, 820.0)
        }
    } else {
        if is_vertical {
            (520.0, 520.0)
        } else {
            (480.0, 520.0)
        }
    };

    let _ = window.set_shadow(false);
    let _ = window.set_size(Size::Logical(LogicalSize::new(target_w, target_h)));
    if let Some(on_top) = always_on_top {
        let _ = window.set_always_on_top(on_top);
    }

    if !floating {
        position_window_at_edge(&window, &edge, offset_ratio, target_w, target_h);
    }
    Ok(())
}

/// Register or unregister the app in Windows HKCU\...\Run so it launches on PC boot
#[tauri::command]
fn set_autostart(enabled: bool) -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        if enabled {
            let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
            let exe_str = format!("\"{}\"", exe_path.to_string_lossy());
            Command::new("reg")
                .args([
                    "add",
                    AUTOSTART_REG_KEY,
                    "/v",
                    AUTOSTART_VALUE_NAME,
                    "/t",
                    "REG_SZ",
                    "/d",
                    &exe_str,
                    "/f",
                ])
                .output()
                .map_err(|e| format!("Failed to set registry autostart: {}", e))?;
        } else {
            let _ = Command::new("reg")
                .args([
                    "delete",
                    AUTOSTART_REG_KEY,
                    "/v",
                    AUTOSTART_VALUE_NAME,
                    "/f",
                ])
                .output();
        }
    }
    Ok(enabled)
}

/// Check if Windows boot autostart is currently enabled
#[tauri::command]
fn get_autostart() -> bool {
    #[cfg(target_os = "windows")]
    {
        if let Ok(output) = Command::new("reg")
            .args(["query", AUTOSTART_REG_KEY, "/v", AUTOSTART_VALUE_NAME])
            .output()
        {
            return output.status.success();
        }
    }
    false
}

/// Toggle OS-level click-through ("Ghost Mode")
#[tauri::command]
fn set_ghost_mode(window: WebviewWindow, ghost: bool) -> Result<(), String> {
    GHOST_MODE.store(ghost, Ordering::SeqCst);
    GHOST_CHANGED_MS.store(current_epoch_ms(), Ordering::SeqCst);
    window
        .set_ignore_cursor_events(ghost)
        .map_err(|e| format!("Failed to set click-through ghost mode: {}", e))
}

/// Anchor or unpin window from HWND_TOPMOST
#[tauri::command]
fn set_always_on_top(window: WebviewWindow, always_on_top: bool) -> Result<(), String> {
    window
        .set_always_on_top(always_on_top)
        .map_err(|e| format!("Failed to set always_on_top: {}", e))
}

/// Initiate native frameless window dragging
#[tauri::command]
fn start_window_drag(window: WebviewWindow) -> Result<(), String> {
    window
        .start_dragging()
        .map_err(|e| format!("Failed to start window drag: {}", e))
}

/// Persist user schedule, tasks, and window coordinates to local JSON
#[tauri::command]
fn save_hud_state(app: AppHandle, state_json: String) -> Result<(), String> {
    let path = get_state_file_path(&app)?;
    fs::write(path, state_json).map_err(|e| format!("Failed to write state file: {}", e))
}

/// Load persisted HUD state from local JSON
#[tauri::command]
fn load_hud_state(app: AppHandle) -> Result<Option<String>, String> {
    let path = get_state_file_path(&app)?;
    if !path.exists() {
        return Ok(None);
    }
    let content =
        fs::read_to_string(path).map_err(|e| format!("Failed to read state file: {}", e))?;
    Ok(Some(content))
}

/// Helper to toggle ghost mode from Rust (global hotkey or system tray) and sync React UI
fn toggle_ghost_from_rust(window: &WebviewWindow, force_value: Option<bool>) {
    let next = match force_value {
        Some(v) => v,
        None => !GHOST_MODE.load(Ordering::SeqCst),
    };
    GHOST_MODE.store(next, Ordering::SeqCst);
    GHOST_CHANGED_MS.store(current_epoch_ms(), Ordering::SeqCst);
    let _ = window.set_ignore_cursor_events(next);
    let js = format!(
        "if (window.__CHRONOSLAB_SYNC_GHOST__) window.__CHRONOSLAB_SYNC_GHOST__({});",
        next
    );
    let _ = window.eval(&js);
}

#[cfg(target_os = "windows")]
fn spawn_global_hotkey_and_unghost_watcher(window: WebviewWindow) {
    thread::spawn(move || {
        const VK_LBUTTON: i32 = 0x01;
        const VK_CONTROL: i32 = 0x11;
        const VK_SHIFT: i32 = 0x10;
        const VK_MENU: i32 = 0x12; // Alt key
        const VK_G: i32 = 0x47;
        const VK_T: i32 = 0x54;
        const VK_B: i32 = 0x42;
        const VK_C: i32 = 0x43;

        let mut prev_lbutton = false;
        let mut prev_ghost_combo = false;
        let mut prev_alt_t = false;
        let mut prev_alt_b = false;
        let mut prev_alt_c = false;
        let mut temp_interactive_top_bar = false;

        loop {
            unsafe {
                let lbutton_down = (GetAsyncKeyState(VK_LBUTTON) as u16 & 0x8000) != 0;
                let ctrl = (GetAsyncKeyState(VK_CONTROL) as u16 & 0x8000) != 0;
                let shift = (GetAsyncKeyState(VK_SHIFT) as u16 & 0x8000) != 0;
                let alt = (GetAsyncKeyState(VK_MENU) as u16 & 0x8000) != 0;
                let g_down = (GetAsyncKeyState(VK_G) as u16 & 0x8000) != 0;
                let t_down = (GetAsyncKeyState(VK_T) as u16 & 0x8000) != 0;
                let b_down = (GetAsyncKeyState(VK_B) as u16 & 0x8000) != 0;
                let c_down = (GetAsyncKeyState(VK_C) as u16 & 0x8000) != 0;

                // 1. Global Ctrl + Shift + G (or Alt + G): Toggle Ghost Mode from ANY app
                let ghost_combo = (ctrl && shift && g_down) || (alt && g_down);
                if ghost_combo && !prev_ghost_combo {
                    toggle_ghost_from_rust(&window, None);
                }
                prev_ghost_combo = ghost_combo;

                // 2. Global Alt + T: Un-ghost & Open Quick-Add Task from ANY app
                let alt_t = alt && !ctrl && t_down;
                if alt_t && !prev_alt_t {
                    toggle_ghost_from_rust(&window, Some(false));
                    let _ = window.set_focus();
                    let _ = window.eval(
                        "if (window.__CHRONOSLAB_QUICK_ADD__) window.__CHRONOSLAB_QUICK_ADD__('task');",
                    );
                }
                prev_alt_t = alt_t;

                // 3. Global Alt + B: Un-ghost & Open Quick-Add Block from ANY app
                let alt_b = alt && !ctrl && b_down;
                if alt_b && !prev_alt_b {
                    toggle_ghost_from_rust(&window, Some(false));
                    let _ = window.set_focus();
                    let _ = window.eval(
                        "if (window.__CHRONOSLAB_QUICK_ADD__) window.__CHRONOSLAB_QUICK_ADD__('block');",
                    );
                }
                prev_alt_b = alt_b;

                // 4. Global Alt + C: Trigger Focus Check-In
                let alt_c = alt && !ctrl && c_down;
                if alt_c && !prev_alt_c {
                    toggle_ghost_from_rust(&window, Some(false));
                    let _ = window.eval(
                        "window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', altKey: true }));",
                    );
                }
                prev_alt_c = alt_c;

                // 5. Smart Top-Bar Mouse Un-Ghost Zone & Direct Win32 Click Un-Ghost:
                // When Ghost Mode is active, if the user moves their mouse into the top strip of the
                // HUD window (where the Un-Ghost button lives) OR clicks on it, un-ghost immediately!
                if GHOST_MODE.load(Ordering::SeqCst) {
                    let mut pt = POINT { x: 0, y: 0 };
                    if GetCursorPos(&mut pt) != 0 {
                        if let (Ok(win_pos), Ok(win_size)) =
                            (window.outer_position(), window.outer_size())
                        {
                            let in_x =
                                pt.x >= win_pos.x && pt.x <= (win_pos.x + win_size.width as i32);
                            let in_top_strip = pt.y >= win_pos.y && pt.y <= (win_pos.y + 110);

                            if in_x && in_top_strip {
                                if !temp_interactive_top_bar {
                                    let _ = window.set_ignore_cursor_events(false);
                                    temp_interactive_top_bar = true;
                                }
                                // Direct OS-level click detector on the Ghost pill (after 400ms debounce)
                                let elapsed = current_epoch_ms()
                                    .saturating_sub(GHOST_CHANGED_MS.load(Ordering::SeqCst));
                                if lbutton_down && !prev_lbutton && elapsed > 400 {
                                    toggle_ghost_from_rust(&window, Some(false));
                                    temp_interactive_top_bar = false;
                                }
                            } else if temp_interactive_top_bar {
                                let _ = window.set_ignore_cursor_events(true);
                                temp_interactive_top_bar = false;
                            }
                        }
                    }
                } else {
                    temp_interactive_top_bar = false;
                }

                prev_lbutton = lbutton_down;
            }

            thread::sleep(Duration::from_millis(25));
        }
    });
}

fn main() {
    #[cfg(target_os = "windows")]
    enforce_single_instance();

    remove_duplicate_startup_vbs();

    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            center_window_top,
            sync_window_bounds,
            set_autostart,
            get_autostart,
            set_ghost_mode,
            set_always_on_top,
            start_window_drag,
            save_hud_state,
            load_hud_state,
        ])
        .setup(|app| {
            let _ = set_autostart(true);

            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_resizable(false);
                let _ = window.set_shadow(false);
                let _ = window.set_always_on_top(true);
                let _ = window.set_skip_taskbar(true);
                let _ = window.set_ignore_cursor_events(false);
                position_window_top_center(&window);

                // Set up System Tray Icon & Menu so user can always un-ghost or quit from tray
                let toggle_ghost_item = MenuItem::with_id(
                    app,
                    "toggle_ghost",
                    "Toggle Ghost / Click-Through (Ctrl+Shift+G)",
                    true,
                    None::<&str>,
                )?;
                let center_item = MenuItem::with_id(
                    app,
                    "center_notch",
                    "Dock to Top-Center Notch",
                    true,
                    None::<&str>,
                )?;
                let quit_item = MenuItem::with_id(app, "quit", "Quit ChronoSlab HUD", true, None::<&str>)?;

                let menu = Menu::with_items(app, &[&toggle_ghost_item, &center_item, &quit_item])?;

                let win_for_menu = window.clone();
                let win_for_click = window.clone();

                let mut tray_builder = TrayIconBuilder::new()
                    .menu(&menu)
                    .tooltip("ChronoSlab 3D HUD (Click to Un-Ghost)")
                    .on_menu_event(move |app_handle, event| match event.id.as_ref() {
                        "toggle_ghost" => {
                            toggle_ghost_from_rust(&win_for_menu, None);
                        }
                        "center_notch" => {
                            toggle_ghost_from_rust(&win_for_menu, Some(false));
                            position_window_top_center(&win_for_menu);
                        }
                        "quit" => {
                            app_handle.exit(0);
                        }
                        _ => {}
                    })
                    .on_tray_icon_event(move |_tray, event| {
                        if let TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        } = event
                        {
                            // Left-clicking the tray icon always un-ghosts and brings HUD back
                            toggle_ghost_from_rust(&win_for_click, Some(false));
                        }
                    });

                if let Some(icon) = app.default_window_icon() {
                    tray_builder = tray_builder.icon(icon.clone());
                }
                let _ = tray_builder.build(app);

                #[cfg(target_os = "windows")]
                spawn_global_hotkey_and_unghost_watcher(window);
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running ChronoSlab 3D HUD");
}
