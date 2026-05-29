pub mod migrations;

use std::path::{Path, PathBuf};
use std::sync::Mutex;

use rusqlite::Connection;

pub struct AppState {
    pub data_dir: PathBuf,
    pub connection: Mutex<Connection>,
}

impl AppState {
    pub fn new(data_dir: PathBuf, connection: Connection) -> Self {
        Self {
            data_dir,
            connection: Mutex::new(connection),
        }
    }
}

pub fn open_database(data_dir: &Path) -> Result<Connection, Box<dyn std::error::Error>> {
    let db_path = data_dir.join("database").join("edge-notes.db");
    let connection = Connection::open(db_path)?;
    migrations::run(&connection)?;
    Ok(connection)
}
