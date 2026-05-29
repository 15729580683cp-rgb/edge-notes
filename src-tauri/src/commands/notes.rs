use std::collections::HashSet;

use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension, Row};
use tauri::State;
use uuid::Uuid;

use crate::db::AppState;
use crate::models::Note;

#[tauri::command]
pub fn list_notes(state: State<'_, AppState>) -> Result<Vec<Note>, String> {
    let connection = state.connection.lock().map_err(|error| error.to_string())?;
    let mut statement = connection
        .prepare(
            "SELECT id, title, content, excerpt, created_at, updated_at, pinned, deleted
         FROM notes
         WHERE deleted = 0
         ORDER BY pinned DESC, updated_at DESC",
        )
        .map_err(|error| error.to_string())?;

    let rows = statement
        .query_map([], note_from_row)
        .map_err(|error| error.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_note(id: String, state: State<'_, AppState>) -> Result<Note, String> {
    let connection = state.connection.lock().map_err(|error| error.to_string())?;
    get_note_by_id(&connection, &id)
}

#[tauri::command]
pub fn create_note(state: State<'_, AppState>) -> Result<Note, String> {
    let connection = state.connection.lock().map_err(|error| error.to_string())?;
    let now = Utc::now().timestamp_millis();
    let id = Uuid::new_v4().simple().to_string();
    let content = String::new();
    let title = extract_title(&content);
    let excerpt = extract_excerpt(&content);

    connection
        .execute(
            "INSERT INTO notes (id, title, content, excerpt, created_at, updated_at, pinned, deleted)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, 0)",
            params![id, title, content, excerpt, now, now],
        )
        .map_err(|error| error.to_string())?;

    get_note_by_id(&connection, &id)
}

#[tauri::command]
pub fn update_note(id: String, content: String, state: State<'_, AppState>) -> Result<Note, String> {
    let connection = state.connection.lock().map_err(|error| error.to_string())?;
    let now = Utc::now().timestamp_millis();
    let title = extract_title(&content);
    let excerpt = extract_excerpt(&content);

    connection
        .execute(
            "UPDATE notes
             SET title = ?1, content = ?2, excerpt = ?3, updated_at = ?4
             WHERE id = ?5 AND deleted = 0",
            params![title, content, excerpt, now, id],
        )
        .map_err(|error| error.to_string())?;

    mark_orphan_assets(&connection, &id, &content, now)?;
    get_note_by_id(&connection, &id)
}

#[tauri::command]
pub fn delete_note(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let connection = state.connection.lock().map_err(|error| error.to_string())?;
    let now = Utc::now().timestamp_millis();

    connection
        .execute(
            "UPDATE notes SET deleted = 1, updated_at = ?1 WHERE id = ?2",
            params![now, id],
        )
        .map_err(|error| error.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn search_notes(keyword: String, state: State<'_, AppState>) -> Result<Vec<Note>, String> {
    let connection = state.connection.lock().map_err(|error| error.to_string())?;
    let like = format!("%{}%", keyword);
    let mut statement = connection
        .prepare(
            "SELECT id, title, content, excerpt, created_at, updated_at, pinned, deleted
             FROM notes
             WHERE deleted = 0
               AND (title LIKE ?1 OR content LIKE ?1)
             ORDER BY pinned DESC, updated_at DESC",
        )
        .map_err(|error| error.to_string())?;

    let rows = statement
        .query_map(params![like], note_from_row)
        .map_err(|error| error.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn toggle_note_pin(id: String, state: State<'_, AppState>) -> Result<Note, String> {
    let connection = state.connection.lock().map_err(|error| error.to_string())?;
    let now = Utc::now().timestamp_millis();

    connection
        .execute(
            "UPDATE notes
             SET pinned = CASE pinned WHEN 1 THEN 0 ELSE 1 END,
                 updated_at = ?1
             WHERE id = ?2 AND deleted = 0",
            params![now, id],
        )
        .map_err(|error| error.to_string())?;

    get_note_by_id(&connection, &id)
}

fn get_note_by_id(connection: &Connection, id: &str) -> Result<Note, String> {
    connection
        .query_row(
            "SELECT id, title, content, excerpt, created_at, updated_at, pinned, deleted
             FROM notes
             WHERE id = ?1 AND deleted = 0",
            params![id],
            note_from_row,
        )
        .optional()
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "note not found".to_string())
}

fn note_from_row(row: &Row<'_>) -> rusqlite::Result<Note> {
    Ok(Note {
        id: row.get(0)?,
        title: row.get(1)?,
        content: row.get(2)?,
        excerpt: row.get(3)?,
        created_at: row.get(4)?,
        updated_at: row.get(5)?,
        pinned: row.get::<_, i64>(6)? != 0,
        deleted: row.get::<_, i64>(7)? != 0,
    })
}

fn extract_title(markdown: &str) -> String {
    let first = markdown
        .lines()
        .map(str::trim)
        .find(|line| !line.is_empty())
        .unwrap_or("未命名便签");

    let title = first
        .trim_start_matches('#')
        .trim()
        .trim_start_matches("- ")
        .trim_start_matches("* ")
        .trim_start_matches("+ ")
        .trim();

    let title = if title.starts_with("![") { "[图片]" } else { title };
    title.chars().take(60).collect()
}

fn extract_excerpt(markdown: &str) -> String {
    markdown
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .map(|line| if line.starts_with("![") { "[图片]" } else { line })
        .collect::<Vec<_>>()
        .join(" ")
        .replace(['#', '>', '*', '_', '`', '~'], "")
        .chars()
        .take(120)
        .collect()
}

fn parse_asset_ids(markdown: &str) -> HashSet<String> {
    let marker = "edgenotes://asset/";
    let mut ids = HashSet::new();
    let mut rest = markdown;

    while let Some(index) = rest.find(marker) {
        let start = index + marker.len();
        let candidate = &rest[start..];
        let id: String = candidate
            .chars()
            .take_while(|ch| ch.is_ascii_alphanumeric() || *ch == '_' || *ch == '-')
            .collect();
        let id_len = id.len();

        if !id.is_empty() {
            ids.insert(id);
        }

        rest = &candidate[id_len..];
    }

    ids
}

fn mark_orphan_assets(
    connection: &Connection,
    note_id: &str,
    markdown: &str,
    now: i64,
) -> Result<(), String> {
    let used_asset_ids = parse_asset_ids(markdown);
    let mut statement = connection
        .prepare("SELECT id FROM assets WHERE note_id = ?1")
        .map_err(|error| error.to_string())?;
    let rows = statement
        .query_map(params![note_id], |row| row.get::<_, String>(0))
        .map_err(|error| error.to_string())?;
    let asset_ids = rows
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())?;

    for asset_id in asset_ids {
        let orphaned = !used_asset_ids.contains(&asset_id);
        connection
            .execute(
                "UPDATE assets SET orphaned = ?1, updated_at = ?2 WHERE id = ?3",
                params![if orphaned { 1_i64 } else { 0_i64 }, now, asset_id],
            )
            .map_err(|error| error.to_string())?;
    }

    Ok(())
}
