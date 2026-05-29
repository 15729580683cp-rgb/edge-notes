use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Note {
    pub id: String,
    pub title: String,
    pub content: String,
    pub excerpt: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub pinned: bool,
    pub deleted: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedAsset {
    pub id: String,
    pub note_id: String,
    pub file_name: String,
    pub mime_type: String,
    pub size: i64,
    pub markdown_url: String,
    pub preview_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AssetRecord {
    pub id: String,
    pub note_id: String,
    pub r#type: String,
    pub file_name: String,
    pub file_path: String,
    pub mime_type: String,
    pub size: i64,
    pub created_at: i64,
    pub updated_at: i64,
    pub orphaned: bool,
    pub markdown_url: String,
    pub preview_url: String,
}
