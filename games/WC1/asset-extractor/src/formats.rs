//! File format definitions for Warcraft I assets

/// Supported file formats
#[derive(Debug, Clone, PartialEq)]
pub enum FileFormat {
    /// Unknown or unsupported format
    Unknown,
    
    /// Image formats
    Image(ImageFormat),
    
    /// Audio formats
    Audio(AudioFormat),
    
    /// Data formats
    Data(DataFormat),
}

/// Supported image formats
#[derive(Debug, Clone, PartialEq)]
pub enum ImageFormat {
    /// PNG image
    Png,
    
    /// JPEG image
    Jpeg,
    
    /// GIF image
    Gif,
    
    /// BMP image
    Bmp,
}

/// Supported audio formats
#[derive(Debug, Clone, PartialEq)]
pub enum AudioFormat {
    /// WAV audio
    Wav,
    
    /// MP3 audio
    Mp3,
    
    /// OGG audio
    Ogg,
}

/// Supported data formats
#[derive(Debug, Clone, PartialEq)]
pub enum DataFormat {
    /// Binary data
    Binary,
    
    /// Text data
    Text,
    
    /// JSON data
    Json,
}

/// Detect file format from file extension
pub fn detect_format_from_extension(extension: &str) -> FileFormat {
    match extension.to_lowercase().as_str() {
        "png" => FileFormat::Image(ImageFormat::Png),
        "jpg" | "jpeg" => FileFormat::Image(ImageFormat::Jpeg),
        "gif" => FileFormat::Image(ImageFormat::Gif),
        "bmp" => FileFormat::Image(ImageFormat::Bmp),
        "wav" => FileFormat::Audio(AudioFormat::Wav),
        "mp3" => FileFormat::Audio(AudioFormat::Mp3),
        "ogg" => FileFormat::Audio(AudioFormat::Ogg),
        "json" => FileFormat::Data(DataFormat::Json),
        "txt" => FileFormat::Data(DataFormat::Text),
        _ => FileFormat::Data(DataFormat::Binary),
    }
}
