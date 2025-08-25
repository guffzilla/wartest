use crate::asset_extractors::{AssetExtractor, AssetType};
use anyhow::Result;
use std::path::Path;

/// Image asset extractor
pub struct ImageExtractor;

impl AssetExtractor for ImageExtractor {
    type Output = Vec<String>;

    fn extract<P: AsRef<Path>>(&self, source: P, output: P) -> Result<Self::Output> {
        // TODO: Implement image extraction
        Ok(vec![])
    }

    fn can_extract<P: AsRef<Path>>(&self, _source: P) -> bool {
        // TODO: Implement format detection
        true
    }
}
