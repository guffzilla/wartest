use anyhow::Result;

/// Pattern recognition engine
pub struct PatternRecognitionEngine {
    /// Recognition configuration
    config: RecognitionConfig,
}

/// Recognition configuration
pub struct RecognitionConfig {
    /// Minimum pattern length
    pub min_pattern_length: usize,
    /// Maximum pattern length
    pub max_pattern_length: usize,
    /// Pattern similarity threshold
    pub similarity_threshold: f64,
    /// Enable fuzzy matching
    pub enable_fuzzy: bool,
}

impl PatternRecognitionEngine {
    /// Create new pattern recognition engine
    pub fn new(config: RecognitionConfig) -> Self {
        Self { config }
    }

    /// Recognize patterns in data
    pub fn recognize_patterns(&self, data: &[u8]) -> Result<Vec<RecognizedPattern>> {
        let mut patterns = Vec::new();
        
        // Look for repeating sequences
        let repeating = self.find_repeating_patterns(data)?;
        patterns.extend(repeating);
        
        // Look for known signatures
        let signatures = self.find_signature_patterns(data)?;
        patterns.extend(signatures);
        
        // Look for structural patterns
        let structural = self.find_structural_patterns(data)?;
        patterns.extend(structural);
        
        Ok(patterns)
    }

    /// Find repeating patterns in data
    fn find_repeating_patterns(&self, data: &[u8]) -> Result<Vec<RecognizedPattern>> {
        let mut patterns = Vec::new();
        
        for length in self.config.min_pattern_length..=self.config.max_pattern_length.min(data.len() / 2) {
            for start in 0..=data.len() - length * 2 {
                let pattern = &data[start..start + length];
                
                // Count occurrences
                let mut count = 1;
                let mut pos = start + length;
                
                while pos + length <= data.len() {
                    if &data[pos..pos + length] == pattern {
                        count += 1;
                        pos += length;
                    } else {
                        pos += 1;
                    }
                }
                
                if count > 1 {
                    patterns.push(RecognizedPattern {
                        pattern: pattern.to_vec(),
                        pattern_type: PatternType::Repeating,
                        confidence: (count as f64 / 10.0).min(1.0),
                        occurrences: count,
                        positions: vec![start],
                    });
                }
            }
        }
        
        Ok(patterns)
    }

    /// Find signature patterns (known byte sequences)
    fn find_signature_patterns(&self, data: &[u8]) -> Result<Vec<RecognizedPattern>> {
        let mut patterns = Vec::new();
        
        // Known signatures
        let signatures = [
            (b"MPQ", "MPQ Archive Header"),
            (b"BLP", "BLP Image Header"),
            (b"MDL", "MDX Model Header"),
            (b"RIF", "WAV Audio Header"),
            (b"WC3", "Warcraft III Data"),
        ];
        
        for (signature, description) in signatures {
            if let Some(pos) = self.find_signature(data, signature) {
                patterns.push(RecognizedPattern {
                    pattern: signature.to_vec(),
                    pattern_type: PatternType::Signature,
                    confidence: 0.9,
                    occurrences: 1,
                    positions: vec![pos],
                });
            }
        }
        
        Ok(patterns)
    }

    /// Find structural patterns (headers, footers, etc.)
    fn find_structural_patterns(&self, data: &[u8]) -> Result<Vec<RecognizedPattern>> {
        let mut patterns = Vec::new();
        
        // Look for potential headers (first few bytes)
        if data.len() >= 4 {
            let header = &data[0..4];
            patterns.push(RecognizedPattern {
                pattern: header.to_vec(),
                pattern_type: PatternType::Header,
                confidence: 0.7,
                occurrences: 1,
                positions: vec![0],
            });
        }
        
        // Look for potential footers (last few bytes)
        if data.len() >= 4 {
            let footer_start = data.len() - 4;
            let footer = &data[footer_start..];
            patterns.push(RecognizedPattern {
                pattern: footer.to_vec(),
                pattern_type: PatternType::Footer,
                confidence: 0.7,
                occurrences: 1,
                positions: vec![footer_start],
            });
        }
        
        Ok(patterns)
    }

    /// Find signature in data
    fn find_signature(&self, data: &[u8], signature: &[u8]) -> Option<usize> {
        data.windows(signature.len())
            .position(|window| window == signature)
    }

    /// Calculate pattern similarity
    pub fn calculate_similarity(&self, pattern1: &[u8], pattern2: &[u8]) -> f64 {
        if pattern1.len() != pattern2.len() {
            return 0.0;
        }
        
        let mut matches = 0;
        for (a, b) in pattern1.iter().zip(pattern2.iter()) {
            if a == b {
                matches += 1;
            }
        }
        
        matches as f64 / pattern1.len() as f64
    }

    /// Check if patterns are similar
    pub fn are_similar(&self, pattern1: &[u8], pattern2: &[u8]) -> bool {
        self.calculate_similarity(pattern1, pattern2) >= self.config.similarity_threshold
    }
}

impl Default for RecognitionConfig {
    fn default() -> Self {
        Self {
            min_pattern_length: 4,
            max_pattern_length: 64,
            similarity_threshold: 0.8,
            enable_fuzzy: true,
        }
    }
}

/// Recognized pattern
#[derive(Debug, Clone)]
pub struct RecognizedPattern {
    /// Pattern bytes
    pub pattern: Vec<u8>,
    /// Pattern type
    pub pattern_type: PatternType,
    /// Confidence level (0.0 to 1.0)
    pub confidence: f64,
    /// Number of occurrences
    pub occurrences: usize,
    /// Positions where pattern was found
    pub positions: Vec<usize>,
}

impl RecognizedPattern {
    /// Create new recognized pattern
    pub fn new(pattern: Vec<u8>, pattern_type: PatternType, confidence: f64) -> Self {
        Self {
            pattern,
            pattern_type,
            confidence,
            occurrences: 1,
            positions: vec![0],
        }
    }

    /// Get pattern length
    pub fn length(&self) -> usize {
        self.pattern.len()
    }

    /// Get pattern as hex string
    pub fn hex_string(&self) -> String {
        self.pattern.iter()
            .map(|b| format!("{:02x}", b))
            .collect::<Vec<String>>()
            .join("")
    }

    /// Get pattern as string (if possible)
    pub fn as_string(&self) -> String {
        String::from_utf8_lossy(&self.pattern).to_string()
    }

    /// Check if pattern is high confidence
    pub fn is_high_confidence(&self) -> bool {
        self.confidence > 0.8
    }

    /// Add occurrence position
    pub fn add_position(&mut self, position: usize) {
        self.positions.push(position);
        self.occurrences = self.positions.len();
    }
}

/// Pattern types
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PatternType {
    /// Repeating pattern
    Repeating,
    /// Known signature
    Signature,
    /// Header pattern
    Header,
    /// Footer pattern
    Footer,
    /// Structural pattern
    Structural,
    /// Unknown pattern
    Unknown,
}

impl PatternType {
    /// Get pattern type description
    pub fn description(&self) -> &'static str {
        match self {
            PatternType::Repeating => "Repeating sequence",
            PatternType::Signature => "Known signature",
            PatternType::Header => "File header",
            PatternType::Footer => "File footer",
            PatternType::Structural => "Structural element",
            PatternType::Unknown => "Unknown pattern",
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pattern_recognition_engine_new() {
        let config = RecognitionConfig::default();
        let engine = PatternRecognitionEngine::new(config);
        assert_eq!(engine.config.min_pattern_length, 4);
        assert_eq!(engine.config.max_pattern_length, 64);
    }

    #[test]
    fn test_recognition_config_default() {
        let config = RecognitionConfig::default();
        assert_eq!(config.min_pattern_length, 4);
        assert_eq!(config.max_pattern_length, 64);
        assert_eq!(config.similarity_threshold, 0.8);
        assert!(config.enable_fuzzy);
    }

    #[test]
    fn test_recognized_pattern() {
        let pattern = RecognizedPattern::new(
            vec![0x41, 0x42, 0x43], // "ABC"
            PatternType::Signature,
            0.9,
        );
        
        assert_eq!(pattern.length(), 3);
        assert_eq!(pattern.hex_string(), "414243");
        assert_eq!(pattern.as_string(), "ABC");
        assert!(pattern.is_high_confidence());
    }

    #[test]
    fn test_pattern_type_description() {
        assert_eq!(PatternType::Repeating.description(), "Repeating sequence");
        assert_eq!(PatternType::Signature.description(), "Known signature");
        assert_eq!(PatternType::Header.description(), "File header");
    }

    #[test]
    fn test_similarity_calculation() {
        let config = RecognitionConfig::default();
        let engine = PatternRecognitionEngine::new(config);
        
        let pattern1 = b"ABCD";
        let pattern2 = b"ABCD";
        let pattern3 = b"ABCE";
        
        assert_eq!(engine.calculate_similarity(pattern1, pattern2), 1.0);
        assert_eq!(engine.calculate_similarity(pattern1, pattern3), 0.75);
        assert!(engine.are_similar(pattern1, pattern2));
        assert!(!engine.are_similar(pattern1, pattern3));
    }

    #[test]
    fn test_find_signature() {
        let config = RecognitionConfig::default();
        let engine = PatternRecognitionEngine::new(config);
        
        let data = b"HelloMPQWorld";
        let signature = b"MPQ";
        
        let pos = engine.find_signature(data, signature);
        assert_eq!(pos, Some(5));
    }
}
