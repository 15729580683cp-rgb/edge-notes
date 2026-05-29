use std::fs;
use std::path::PathBuf;

use chrono::{Datelike, Utc};
use rusqlite::{params, OptionalExtension, Row};
use tauri::State;
use uuid::Uuid;

use crate::db::AppState;
use crate::models::{AssetRecord, SavedAsset};
use crate::utils::image::{mime_to_extension, validate_image};
use crate::utils::path::join_relative_path;

#[tauri::command]
pub fn save_image_asset(
    note_id: String,
    file_name: String,
    mime_type: String,
    bytes: Vec<u8>,
    state: State<'_, AppState>,
) -> Result<SavedAsset, String> {
    validate_image(&mime_type, bytes.len())?;
    save_image_asset_impl(&state, note_id, file_name, mime_type, bytes)
}

#[tauri::command]
pub fn import_image_from_path(
    note_id: String,
    source_path: String,
    state: State<'_, AppState>,
) -> Result<SavedAsset, String> {
    let path = PathBuf::from(&source_path);
    let bytes = fs::read(&path).map_err(|error| error.to_string())?;
    let mime_type = mime_guess::from_path(&path)
        .first_or_octet_stream()
        .essence_str()
        .to_string();
    let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("image")
        .to_string();

    validate_image(&mime_type, bytes.len())?;
    save_image_asset_impl(&state, note_id, file_name, mime_type, bytes)
}

#[tauri::command]
pub fn resolve_asset_url(asset_id: String, state: State<'_, AppState>) -> Result<String, String> {
    let connection = state.connection.lock().map_err(|error| error.to_string())?;
    let relative_path: String = connection
        .query_row(
            "SELECT file_path FROM assets WHERE id = ?1",
            params![asset_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "asset not found".to_string())?;

    Ok(join_relative_path(&state.data_dir, &relative_path)
        .to_string_lossy()
        .to_string())
}

#[tauri::command]
pub fn list_assets(
    note_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<AssetRecord>, String> {
    let connection = state.connection.lock().map_err(|error| error.to_string())?;
    let mut statement = connection
        .prepare(
            "SELECT id, note_id, type, file_name, file_path, mime_type, size, created_at, updated_at, orphaned
             FROM assets
             WHERE note_id = ?1
             ORDER BY created_at DESC",
        )
        .map_err(|error| error.to_string())?;

    let rows = statement
        .query_map(params![note_id], asset_from_row)
        .map_err(|error| error.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())
}

fn save_image_asset_impl(
    state: &State<'_, AppState>,
    note_id: String,
    file_name: String,
    mime_type: String,
    bytes: Vec<u8>,
) -> Result<SavedAsset, String> {
    let asset_id = Uuid::new_v4().simple().to_string();
    let extension = mime_to_extension(&mime_type)?;
    let now = Utc::now();
    let timestamp = now.timestamp_millis();
    let relative_path = format!(
        "assets/images/{:04}/{:02}/{}.{}",
        now.year(),
        now.month(),
        asset_id,
        extension
    );
    let full_path = join_relative_path(&state.data_dir, &relative_path);

    if let Some(parent) = full_path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    fs::write(&full_path, &bytes).map_err(|error| error.to_string())?;

    let saved = SavedAsset {
        id: asset_id.clone(),
        note_id: note_id.clone(),
        file_name: normalized_file_name(&file_name, &mime_type),
        mime_type: mime_type.clone(),
        size: bytes.len() as i64,
        markdown_url: format!("edgenotes://asset/{}", asset_id),
        preview_url: full_path.to_string_lossy().to_string(),
    };

    let connection = state.connection.lock().map_err(|error| error.to_string())?;
    connection
        .execute(
            "INSERT INTO assets
             (id, note_id, type, file_name, file_path, mime_type, size, created_at, updated_at, orphaned)
             VALUES (?1, ?2, 'image', ?3, ?4, ?5, ?6, ?7, ?8, 0)",
            params![
                &saved.id,
                &saved.note_id,
                &saved.file_name,
                &relative_path,
                &saved.mime_type,
                saved.size,
                timestamp,
                timestamp,
            ],
        )
        .map_err(|error| error.to_string())?;

    Ok(saved)
}

fn normalized_file_name(file_name: &str, mime_type: &str) -> String {
    if !file_name.trim().is_empty() {
        return file_name.to_string();
    }

    let extension = mime_to_extension(mime_type).unwrap_or("png");
    let stamp = Utc::now().format("%Y%m%d%H%M%S");
    format!("pasted-{}.{}", stamp, extension)
}

fn asset_from_row(row: &Row<'_>) -> rusqlite::Result<AssetRecord> {
    let id: String = row.get(0)?;
    let file_path: String = row.get(4)?;
    let markdown_url = format!("edgenotes://asset/{}", id);

    Ok(AssetRecord {
        id,
        note_id: row.get(1)?,
        r#type: row.get(2)?,
        file_name: row.get(3)?,
        preview_url: file_path.clone(),
        file_path,
        mime_type: row.get(5)?,
        size: row.get(6)?,
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
        orphaned: row.get::<_, i64>(9)? != 0,
        markdown_url,
    })
}
