#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod db;
mod models;
mod utils;

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let data_dir = utils::path::ensure_data_dirs(app.handle())?;
            let connection = db::open_database(&data_dir)?;

            app.manage(db::AppState::new(data_dir, connection));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::window::set_window_top_center,
            commands::notes::list_notes,
            commands::notes::get_note,
            commands::notes::create_note,
            commands::notes::update_note,
            commands::notes::delete_note,
            commands::notes::search_notes,
            commands::notes::toggle_note_pin,
            commands::assets::save_image_asset,
            commands::assets::import_image_from_path,
            commands::assets::resolve_asset_url,
            commands::assets::list_assets,
        ])
        .run(tauri::generate_context!())
        .expect("error while running EdgeNotes");
}
