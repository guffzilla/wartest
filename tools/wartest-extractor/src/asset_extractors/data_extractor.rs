use crate::asset_extractors::{AssetExtractor, AssetType};
use anyhow::Result;
use std::path::Path;

/// Data asset extractor
pub struct DataExtractor;

impl AssetExtractor for DataExtractor {
    type Output = Vec<String>;

    fn extract<P: AsRef<Path>>(&self, source: P, output: P) -> Result<Self::Output> {
        // TODO: Implement data extraction
        Ok(vec![])
    }

    fn can_extract<P: AsRef<Path>>(&self, _source: P) -> bool {
        // TODO: Implement format detection
        true
    }
}
