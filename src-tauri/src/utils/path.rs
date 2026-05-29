use std::fs;
use std::path::{Path, PathBuf};

use tauri::{AppHandle, Manager};

pub fn ensure_data_dirs(app: &AppHandle) -> Result<PathBuf, Box<dyn std::error::Error>> {
    let data_dir = app.path().app_data_dir()?.join("EdgeNotesData");

    fs::create_dir_all(data_dir.join("database"))?;
    fs::create_dir_all(data_dir.join("assets").join("images"))?;
    fs::create_dir_all(data_dir.join("assets").join("thumbnails"))?;
    fs::create_dir_all(data_dir.join("exports"))?;

    Ok(data_dir)
}

pub fn join_relative_path(root: &Path, relative_path: &str) -> PathBuf {
    relative_path
        .split('/')
        .fold(root.to_path_buf(), |path, segment| path.join(segment))
}
