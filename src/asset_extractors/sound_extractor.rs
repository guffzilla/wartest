use crate::asset_extractors::{AssetExtractor, AssetType};
use anyhow::Result;
use std::path::Path;

/// Sound asset extractor
pub struct SoundExtractor;

impl AssetExtractor for SoundExtractor {
    type Output = Vec<String>;

    fn extract<P: AsRef<Path>>(&self, source: P, output: P) -> Result<Self::Output> {
        // TODO: Implement sound extraction
        Ok(vec![])
    }

    fn can_extract<P: AsRef<Path>>(&self, _source: P) -> bool {
        // TODO: Implement format detection
        true
    }
}
