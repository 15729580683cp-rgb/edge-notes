const MAX_IMAGE_SIZE: usize = 10 * 1024 * 1024;

pub fn validate_image(mime_type: &str, size: usize) -> Result<(), String> {
    if !mime_type.starts_with("image/") {
        return Err("只支持图片文件".to_string());
    }

    if size > MAX_IMAGE_SIZE {
        return Err("图片不能超过 10MB".to_string());
    }

    mime_to_extension(mime_type)?;
    Ok(())
}

pub fn mime_to_extension(mime_type: &str) -> Result<&'static str, String> {
    match mime_type {
        "image/png" => Ok("png"),
        "image/jpeg" | "image/jpg" => Ok("jpg"),
        "image/webp" => Ok("webp"),
        "image/gif" => Ok("gif"),
        _ => Err("不支持的图片格式".to_string()),
    }
}
