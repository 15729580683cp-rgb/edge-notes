use tauri::{AppHandle, LogicalPosition, LogicalSize, Manager};

#[tauri::command]
pub fn set_window_top_center(app: AppHandle, width: f64, height: f64) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "main window not found".to_string())?;

    let monitor = window
        .current_monitor()
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "monitor not found".to_string())?;

    let size = monitor.size();
    let scale_factor = monitor.scale_factor();
    let monitor_width = size.width as f64 / scale_factor;
    let x = (monitor_width - width).max(0.0) / 2.0;

    window
        .set_size(LogicalSize::new(width, height))
        .map_err(|error| error.to_string())?;
    window
        .set_position(LogicalPosition::new(x, 0.0))
        .map_err(|error| error.to_string())?;

    Ok(())
}
