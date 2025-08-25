use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::collections::HashMap;
use walkdir::WalkDir;

/// Web element data structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebElement {
    pub element_type: String,      // "div", "span", "button", "input", etc.
    pub id: Option<String>,
    pub class: Option<String>,
    pub text_content: Option<String>,
    pub attributes: HashMap<String, String>,
    pub inner_html: Option<String>,
    pub file_path: String,
    pub line_number: Option<u32>,
}

/// Web page analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebPage {
    pub url: Option<String>,
    pub title: Option<String>,
    pub file_path: String,
    pub elements: Vec<WebElement>,
    pub scripts: Vec<String>,
    pub styles: Vec<String>,
    pub meta_data: HashMap<String, String>,
}

/// Web Analyzer for WC2 CEF components
pub struct WC2WebAnalyzer {
    game_path: PathBuf,
    output_path: PathBuf,
    web_pages: Vec<WebPage>,
    extracted_data: HashMap<String, serde_json::Value>,
}

impl WC2WebAnalyzer {
    pub fn new(game_path: &str, output_path: &str) -> Self {
        Self {
            game_path: PathBuf::from(game_path),
            output_path: PathBuf::from(output_path),
            web_pages: Vec::new(),
            extracted_data: HashMap::new(),
        }
    }

    /// Perform comprehensive web analysis
    pub fn analyze_all(&mut self) -> Result<()> {
        println!("Starting comprehensive WC2 web analysis...");
        
        // Create output directories
        self.create_output_directories()?;
        
        // Analyze CEF components
        self.analyze_cef_components()?;
        
        // Analyze HTML files
        self.analyze_html_files()?;
        
        // Analyze JavaScript files
        self.analyze_javascript_files()?;
        
        // Analyze CSS files
        self.analyze_css_files()?;
        
        // Analyze JSON configuration files
        self.analyze_json_configs()?;
        
        // Extract game data from web elements
        self.extract_game_data()?;
        
        // Generate analysis reports
        self.generate_reports()?;
        
        println!("Web analysis complete!");
        println!("Analyzed {} web pages", self.web_pages.len());
        println!("Extracted {} data points", self.extracted_data.len());
        
        Ok(())
    }

    fn create_output_directories(&self) -> Result<()> {
        let dirs = [
            "web_analysis",
            "web_analysis/html",
            "web_analysis/javascript", 
            "web_analysis/css",
            "web_analysis/json",
            "web_analysis/reports",
            "web_analysis/extracted_data"
        ];
        
        for dir in &dirs {
            let path = self.output_path.join(dir);
            std::fs::create_dir_all(&path)?;
        }
        
        Ok(())
    }

    fn analyze_cef_components(&mut self) -> Result<()> {
        println!("Analyzing CEF components...");
        
        // Look for CEF-related directories and files
        let cef_paths = [
            self.game_path.join("cef"),
            self.game_path.join("web"),
            self.game_path.join("ui"),
            self.game_path.join("html"),
            self.game_path.join("www"),
            self.game_path.join("assets").join("web"),
        ];

        for cef_path in &cef_paths {
            if cef_path.exists() {
                println!("Found CEF directory: {}", cef_path.display());
                self.analyze_directory(cef_path)?;
            }
        }

        // Look for CEF-related files in data directory
        let data_path = self.game_path.join("data");
        if data_path.exists() {
            self.analyze_data_directory(&data_path)?;
        }

        Ok(())
    }

    fn analyze_data_directory(&mut self, data_path: &Path) -> Result<()> {
        println!("Analyzing data directory for web components...");
        
        for entry in WalkDir::new(data_path)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| e.file_type().is_file()) {
            
            let file_path = entry.path();
            let extension = file_path.extension()
                .and_then(|ext| ext.to_str())
                .unwrap_or("")
                .to_lowercase();

            match extension.as_str() {
                "html" | "htm" => {
                    println!("Found HTML file: {}", file_path.display());
                    self.analyze_html_file(file_path)?;
                }
                "js" | "javascript" => {
                    println!("Found JavaScript file: {}", file_path.display());
                    self.analyze_javascript_file(file_path)?;
                }
                "css" | "stylesheet" => {
                    println!("Found CSS file: {}", file_path.display());
                    self.analyze_css_file(file_path)?;
                }
                "json" => {
                    println!("Found JSON file: {}", file_path.display());
                    self.analyze_json_file(file_path)?;
                }
                _ => {}
            }
        }

        Ok(())
    }

    fn analyze_directory(&mut self, dir_path: &Path) -> Result<()> {
        for entry in WalkDir::new(dir_path)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| e.file_type().is_file()) {
            
            let file_path = entry.path();
            let extension = file_path.extension()
                .and_then(|ext| ext.to_str())
                .unwrap_or("")
                .to_lowercase();

            match extension.as_str() {
                "html" | "htm" => self.analyze_html_file(file_path)?,
                "js" | "javascript" => self.analyze_javascript_file(file_path)?,
                "css" | "stylesheet" => self.analyze_css_file(file_path)?,
                "json" => self.analyze_json_file(file_path)?,
                _ => {}
            }
        }

        Ok(())
    }

    fn analyze_html_files(&mut self) -> Result<()> {
        println!("Analyzing HTML files...");
        
        // Look for HTML files in common locations
        let html_paths = [
            self.game_path.join("ui").join("html"),
            self.game_path.join("web").join("pages"),
            self.game_path.join("cef").join("pages"),
        ];

        for html_path in &html_paths {
            if html_path.exists() {
                self.analyze_directory(html_path)?;
            }
        }

        Ok(())
    }

    fn analyze_javascript_files(&mut self) -> Result<()> {
        println!("Analyzing JavaScript files...");
        
        // Look for JS files in common locations
        let js_paths = [
            self.game_path.join("ui").join("js"),
            self.game_path.join("web").join("js"),
            self.game_path.join("cef").join("js"),
        ];

        for js_path in &js_paths {
            if js_path.exists() {
                self.analyze_directory(js_path)?;
            }
        }

        Ok(())
    }

    fn analyze_css_files(&mut self) -> Result<()> {
        println!("Analyzing CSS files...");
        
        // Look for CSS files in common locations
        let css_paths = [
            self.game_path.join("ui").join("css"),
            self.game_path.join("web").join("css"),
            self.game_path.join("cef").join("css"),
        ];

        for css_path in &css_paths {
            if css_path.exists() {
                self.analyze_directory(css_path)?;
            }
        }

        Ok(())
    }

    fn analyze_json_configs(&mut self) -> Result<()> {
        println!("Analyzing JSON configuration files...");
        
        // Look for JSON files in data directory
        let data_path = self.game_path.join("data");
        if data_path.exists() {
            for entry in WalkDir::new(&data_path)
                .into_iter()
                .filter_map(|e| e.ok())
                .filter(|e| e.file_type().is_file()) {
                
                let file_path = entry.path();
                if file_path.extension().and_then(|ext| ext.to_str()) == Some("json") {
                    self.analyze_json_file(file_path)?;
                }
            }
        }

        Ok(())
    }

    fn analyze_html_file(&mut self, file_path: &Path) -> Result<()> {
        let content = std::fs::read_to_string(file_path)?;
        let mut web_page = WebPage {
            url: None,
            title: None,
            file_path: file_path.to_string_lossy().to_string(),
            elements: Vec::new(),
            scripts: Vec::new(),
            styles: Vec::new(),
            meta_data: HashMap::new(),
        };

        // Extract title
        if let Some(title_start) = content.find("<title>") {
            if let Some(title_end) = content.find("</title>") {
                let title = content[title_start + 7..title_end].trim();
                web_page.title = Some(title.to_string());
            }
        }

        // Extract scripts
        let script_patterns = [
            ("<script", "</script>"),
            ("<script src=\"", "\""),
            ("<script src='", "'"),
        ];

        for (start_pattern, end_pattern) in &script_patterns {
            let mut pos = 0;
            while let Some(start) = content[pos..].find(start_pattern) {
                let start_pos = pos + start;
                if let Some(end) = content[start_pos..].find(end_pattern) {
                    let script_content = content[start_pos..start_pos + end].trim();
                    if !script_content.is_empty() {
                        web_page.scripts.push(script_content.to_string());
                    }
                    pos = start_pos + end + end_pattern.len();
                } else {
                    break;
                }
            }
        }

        // Extract styles
        let style_patterns = [
            ("<style", "</style>"),
            ("<link rel=\"stylesheet\"", ">"),
        ];

        for (start_pattern, end_pattern) in &style_patterns {
            let mut pos = 0;
            while let Some(start) = content[pos..].find(start_pattern) {
                let start_pos = pos + start;
                if let Some(end) = content[start_pos..].find(end_pattern) {
                    let style_content = content[start_pos..start_pos + end].trim();
                    if !style_content.is_empty() {
                        web_page.styles.push(style_content.to_string());
                    }
                    pos = start_pos + end + end_pattern.len();
                } else {
                    break;
                }
            }
        }

        // Extract meta data
        let mut pos = 0;
        while let Some(start) = content[pos..].find("<meta") {
            let start_pos = pos + start;
            if let Some(end) = content[start_pos..].find(">") {
                let meta_tag = content[start_pos..start_pos + end].trim();
                
                // Extract name and content attributes
                if let Some(name_start) = meta_tag.find("name=\"") {
                    if let Some(name_end) = meta_tag[name_start + 6..].find("\"") {
                        let name = meta_tag[name_start + 6..name_start + 6 + name_end].to_string();
                        
                        if let Some(content_start) = meta_tag.find("content=\"") {
                            if let Some(content_end) = meta_tag[content_start + 9..].find("\"") {
                                let content = meta_tag[content_start + 9..content_start + 9 + content_end].to_string();
                                web_page.meta_data.insert(name, content);
                            }
                        }
                    }
                }
                
                pos = start_pos + end + 1;
            } else {
                break;
            }
        }

        // Extract game-related elements
        self.extract_game_elements(&content, &mut web_page)?;

        self.web_pages.push(web_page);
        Ok(())
    }

    fn analyze_javascript_file(&mut self, file_path: &Path) -> Result<()> {
        let content = std::fs::read_to_string(file_path)?;
        
        // Look for game-related variables and functions
        let game_patterns = [
            "unit", "building", "spell", "ability", "resource", "player", "game", "map",
            "health", "damage", "armor", "speed", "mana", "gold", "lumber", "food",
            "human", "orc", "neutral", "alliance", "horde"
        ];

        let mut game_data = HashMap::new();
        
        for pattern in &game_patterns {
            let mut matches = Vec::new();
            let mut pos = 0;
            
            while let Some(start) = content[pos..].to_lowercase().find(pattern) {
                let start_pos = pos + start;
                let end_pos = (start_pos + 100).min(content.len());
                let context = content[start_pos..end_pos].trim();
                matches.push(context.to_string());
                pos = start_pos + 1;
            }
            
            if !matches.is_empty() {
                game_data.insert(pattern.to_string(), matches);
            }
        }

        if !game_data.is_empty() {
            let filename = file_path.file_name().unwrap().to_string_lossy();
            self.extracted_data.insert(
                format!("js_{}", filename),
                serde_json::to_value(game_data)?
            );
        }

        Ok(())
    }

    fn analyze_css_file(&mut self, file_path: &Path) -> Result<()> {
        let content = std::fs::read_to_string(file_path)?;
        
        // Look for game-related CSS classes and IDs
        let game_patterns = [
            "unit", "building", "spell", "ability", "resource", "player", "game", "map",
            "health", "damage", "armor", "speed", "mana", "gold", "lumber", "food",
            "human", "orc", "neutral", "alliance", "horde", "ui", "interface"
        ];

        let mut game_styles = HashMap::new();
        
        for pattern in &game_patterns {
            let mut matches = Vec::new();
            let mut pos = 0;
            
            while let Some(start) = content[pos..].to_lowercase().find(pattern) {
                let start_pos = pos + start;
                let end_pos = (start_pos + 200).min(content.len());
                let context = content[start_pos..end_pos].trim();
                matches.push(context.to_string());
                pos = start_pos + 1;
            }
            
            if !matches.is_empty() {
                game_styles.insert(pattern.to_string(), matches);
            }
        }

        if !game_styles.is_empty() {
            let filename = file_path.file_name().unwrap().to_string_lossy();
            self.extracted_data.insert(
                format!("css_{}", filename),
                serde_json::to_value(game_styles)?
            );
        }

        Ok(())
    }

    fn analyze_json_file(&mut self, file_path: &Path) -> Result<()> {
        let content = std::fs::read_to_string(file_path)?;
        
        // Try to parse as JSON
        if let Ok(json_value) = serde_json::from_str::<serde_json::Value>(&content) {
            let filename = file_path.file_name().unwrap().to_string_lossy();
            self.extracted_data.insert(
                format!("json_{}", filename),
                json_value
            );
        }

        Ok(())
    }

    fn analyze_json_content(&self, json_content: &str, filename: &str) -> Result<serde_json::Value> {
        let parsed: serde_json::Value = serde_json::from_str(json_content)?;
        
        // Create a detailed analysis of the JSON content
        let mut analysis = serde_json::Map::new();
        analysis.insert("filename".to_string(), serde_json::Value::String(filename.to_string()));
        
        if let Some(frames) = parsed.get("frames") {
            if let Some(frames_obj) = frames.as_object() {
                analysis.insert("type".to_string(), serde_json::Value::String("sprite_atlas".to_string()));
                analysis.insert("frame_count".to_string(), serde_json::Value::Number(serde_json::Number::from(frames_obj.len())));
                
                // Analyze sprite names to categorize content
                let mut sprite_categories = std::collections::HashMap::new();
                for sprite_name in frames_obj.keys() {
                    let category = self.categorize_sprite_name(sprite_name);
                    *sprite_categories.entry(category).or_insert(0) += 1;
                }
                
                let categories_json: serde_json::Map<String, serde_json::Value> = sprite_categories
                    .into_iter()
                    .map(|(k, v)| (k.to_string(), serde_json::Value::Number(serde_json::Number::from(v))))
                    .collect();
                analysis.insert("sprite_categories".to_string(), serde_json::Value::Object(categories_json));
                
                // Extract sample sprite names
                let sample_names: Vec<String> = frames_obj.keys().take(10).cloned().collect();
                analysis.insert("sample_sprites".to_string(), serde_json::Value::Array(
                    sample_names.into_iter().map(serde_json::Value::String).collect()
                ));
            }
        } else if let Some(fonts) = parsed.get("fonts") {
            analysis.insert("type".to_string(), serde_json::Value::String("font_config".to_string()));
            if let Some(fonts_array) = fonts.as_array() {
                analysis.insert("font_count".to_string(), serde_json::Value::Number(serde_json::Number::from(fonts_array.len())));
            }
        } else if parsed.as_object().is_some() {
            // Check if it's a simple key-value store (like strings)
            let obj = parsed.as_object().unwrap();
            let key_count = obj.len();
            analysis.insert("type".to_string(), serde_json::Value::String("key_value_store".to_string()));
            analysis.insert("key_count".to_string(), serde_json::Value::Number(serde_json::Number::from(key_count)));
            
            // Sample some keys
            let sample_keys: Vec<String> = obj.keys().take(10).cloned().collect();
            analysis.insert("sample_keys".to_string(), serde_json::Value::Array(
                sample_keys.into_iter().map(serde_json::Value::String).collect()
            ));
        }
        
        // Add meta information if present
        if let Some(meta) = parsed.get("meta") {
            analysis.insert("has_meta".to_string(), serde_json::Value::Bool(true));
            if let Some(related_packs) = meta.get("related_multi_packs") {
                if let Some(packs_array) = related_packs.as_array() {
                    analysis.insert("related_packs_count".to_string(), serde_json::Value::Number(serde_json::Number::from(packs_array.len())));
                }
            }
        } else {
            analysis.insert("has_meta".to_string(), serde_json::Value::Bool(false));
        }
        
        Ok(serde_json::Value::Object(analysis))
    }
    
    fn categorize_sprite_name(&self, sprite_name: &str) -> &'static str {
        let name_lower = sprite_name.to_lowercase();
        
        // Unit categories
        if name_lower.contains("peasant") || name_lower.contains("footman") || name_lower.contains("knight") || 
           name_lower.contains("archer") || name_lower.contains("paladin") || name_lower.contains("mage") ||
           name_lower.contains("wizard") || name_lower.contains("priest") || name_lower.contains("monk") {
            return "human_units";
        }
        
        if name_lower.contains("peon") || name_lower.contains("grunt") || name_lower.contains("ogre") ||
           name_lower.contains("troll") || name_lower.contains("catapult") || name_lower.contains("kodo") ||
           name_lower.contains("goblin") || name_lower.contains("shaman") || name_lower.contains("warlock") {
            return "orc_units";
        }
        
        // Building categories
        if name_lower.contains("townhall") || name_lower.contains("thall") || name_lower.contains("castle") ||
           name_lower.contains("barracks") || name_lower.contains("barr") || name_lower.contains("church") ||
           name_lower.contains("tower") || name_lower.contains("farm") || name_lower.contains("blacksmith") ||
           name_lower.contains("black") || name_lower.contains("aviary") || name_lower.contains("foundry") ||
           name_lower.contains("found") {
            return "human_buildings";
        }
        
        if name_lower.contains("great_hall") || name_lower.contains("ghall") || name_lower.contains("fortress") ||
           name_lower.contains("stronghold") || name_lower.contains("lumber_mill") || name_lower.contains("lmill") ||
           name_lower.contains("war_mill") || name_lower.contains("wmill") || name_lower.contains("temple") ||
           name_lower.contains("altar") || name_lower.contains("nest") || name_lower.contains("den") {
            return "orc_buildings";
        }
        
        // Vehicle categories
        if name_lower.contains("battleship") || name_lower.contains("battlshp") || name_lower.contains("submarine") ||
           name_lower.contains("sub") || name_lower.contains("transport") || name_lower.contains("destroyer") ||
           name_lower.contains("oil_tanker") || name_lower.contains("tanker") {
            return "naval_units";
        }
        
        // Special categories
        if name_lower.contains("cursor") || name_lower.contains("ui") || name_lower.contains("button") {
            return "ui_elements";
        }
        
        if name_lower.contains("water") || name_lower.contains("mask") {
            return "effects";
        }
        
        "other"
    }

    fn extract_game_elements(&mut self, content: &str, web_page: &mut WebPage) -> Result<()> {
        // Look for game-related HTML elements
        let game_patterns = [
            ("unit", "unit-related elements"),
            ("building", "building-related elements"),
            ("spell", "spell-related elements"),
            ("ability", "ability-related elements"),
            ("resource", "resource-related elements"),
            ("player", "player-related elements"),
            ("game", "game-related elements"),
            ("map", "map-related elements"),
            ("health", "health-related elements"),
            ("damage", "damage-related elements"),
            ("armor", "armor-related elements"),
            ("speed", "speed-related elements"),
            ("mana", "mana-related elements"),
            ("gold", "gold-related elements"),
            ("lumber", "lumber-related elements"),
            ("food", "food-related elements"),
            ("human", "human-related elements"),
            ("orc", "orc-related elements"),
            ("neutral", "neutral-related elements"),
            ("alliance", "alliance-related elements"),
            ("horde", "horde-related elements"),
        ];

        for (pattern, description) in &game_patterns {
            let mut pos = 0;
            while let Some(start) = content[pos..].to_lowercase().find(pattern) {
                let start_pos = pos + start;
                
                // Find the containing HTML element
                let element_start = content[..start_pos].rfind('<').unwrap_or(start_pos);
                let element_end = content[start_pos..].find('>').map(|end| start_pos + end + 1).unwrap_or(start_pos + 50);
                
                let element_content = content[element_start..element_end].trim();
                
                let web_element = WebElement {
                    element_type: self.extract_element_type(element_content),
                    id: self.extract_attribute(element_content, "id"),
                    class: self.extract_attribute(element_content, "class"),
                    text_content: self.extract_text_content(element_content),
                    attributes: self.extract_all_attributes(element_content),
                    inner_html: Some(element_content.to_string()),
                    file_path: web_page.file_path.clone(),
                    line_number: None, // Could be calculated if needed
                };
                
                web_page.elements.push(web_element);
                pos = start_pos + 1;
            }
        }

        Ok(())
    }

    fn extract_element_type(&self, element_content: &str) -> String {
        if let Some(start) = element_content.find('<') {
            if let Some(end) = element_content[start + 1..].find(|c: char| c.is_whitespace() || c == '>') {
                return element_content[start + 1..start + 1 + end].to_string();
            }
        }
        "unknown".to_string()
    }

    fn extract_attribute(&self, element_content: &str, attr_name: &str) -> Option<String> {
        let pattern = format!("{}=\"", attr_name);
        if let Some(start) = element_content.find(&pattern) {
            let start_pos = start + pattern.len();
            if let Some(end) = element_content[start_pos..].find("\"") {
                return Some(element_content[start_pos..start_pos + end].to_string());
            }
        }
        None
    }

    fn extract_all_attributes(&self, element_content: &str) -> HashMap<String, String> {
        let mut attributes = HashMap::new();
        
        // Simple attribute extraction
        let attr_patterns = ["id=\"", "class=\"", "data-", "onclick=\"", "onload=\"", "src=\"", "href=\""];
        
        for pattern in &attr_patterns {
            if let Some(start) = element_content.find(pattern) {
                let start_pos = start + pattern.len();
                if let Some(end) = element_content[start_pos..].find("\"") {
                    let value = element_content[start_pos..start_pos + end].to_string();
                    let key = pattern.trim_end_matches("=\"");
                    attributes.insert(key.to_string(), value);
                }
            }
        }
        
        attributes
    }

    fn extract_text_content(&self, element_content: &str) -> Option<String> {
        // Simple text extraction - look for content between tags
        if let Some(start) = element_content.find('>') {
            if let Some(end) = element_content[start + 1..].find('<') {
                let text = element_content[start + 1..start + 1 + end].trim();
                if !text.is_empty() {
                    return Some(text.to_string());
                }
            }
        }
        None
    }

    fn extract_game_data(&mut self) -> Result<()> {
        println!("Extracting game data from web elements...");
        
        let mut game_data = HashMap::new();
        
        for web_page in &self.web_pages {
            for element in &web_page.elements {
                // Extract unit information
                if let Some(text) = &element.text_content {
                    if text.to_lowercase().contains("health") || text.to_lowercase().contains("damage") {
                        game_data.insert(format!("stats_{}", element.id.as_deref().unwrap_or("unknown")), text.clone());
                    }
                }
                
                // Extract resource information
                if let Some(class) = &element.class {
                    if class.to_lowercase().contains("gold") || class.to_lowercase().contains("lumber") {
                        game_data.insert(format!("resource_{}", class), element.text_content.clone().unwrap_or_default());
                    }
                }
                
                // Extract spell information
                if let Some(id) = &element.id {
                    if id.to_lowercase().contains("spell") || id.to_lowercase().contains("ability") {
                        game_data.insert(format!("spell_{}", id), element.text_content.clone().unwrap_or_default());
                    }
                }
            }
        }
        
        if !game_data.is_empty() {
            self.extracted_data.insert("game_data".to_string(), serde_json::to_value(game_data)?);
        }

        Ok(())
    }

    fn generate_reports(&self) -> Result<()> {
        println!("Generating analysis reports...");
        
        // Generate web pages report
        let web_pages_report = serde_json::to_string_pretty(&self.web_pages)?;
        let web_pages_path = self.output_path.join("web_analysis").join("reports").join("web_pages.json");
        std::fs::write(web_pages_path, web_pages_report)?;
        
        // Generate extracted data report
        let extracted_data_report = serde_json::to_string_pretty(&self.extracted_data)?;
        let extracted_data_path = self.output_path.join("web_analysis").join("reports").join("extracted_data.json");
        std::fs::write(extracted_data_path, extracted_data_report)?;
        
        // Generate summary report
        let summary = self.generate_summary();
        let summary_path = self.output_path.join("web_analysis").join("reports").join("summary.txt");
        std::fs::write(summary_path, summary)?;
        
        println!("Reports generated in web_analysis/reports/");
        
        Ok(())
    }

    fn generate_detailed_report(&self) -> Result<()> {
        let mut detailed_analysis = serde_json::Map::new();
        
        // Analyze all JSON files in detail
        let json_dir = self.output_path.join("web_analysis").join("json");
        if json_dir.exists() {
            let mut json_analyses = Vec::new();
            
            for entry in std::fs::read_dir(&json_dir)? {
                let entry = entry?;
                let path = entry.path();
                if path.extension().and_then(|s| s.to_str()) == Some("json") {
                    if let Ok(content) = std::fs::read_to_string(&path) {
                        if let Ok(analysis) = self.analyze_json_content(&content, path.file_name().unwrap().to_string_lossy().as_ref()) {
                            json_analyses.push(analysis);
                        }
                    }
                }
            }
            
            detailed_analysis.insert("json_analyses".to_string(), serde_json::Value::Array(json_analyses));
        }
        
        // Generate summary statistics
        let mut summary = serde_json::Map::new();
        if let Some(analyses) = detailed_analysis.get("json_analyses") {
            if let Some(analyses_array) = analyses.as_array() {
                let mut type_counts = std::collections::HashMap::new();
                let mut total_sprites = 0;
                let mut total_strings = 0;
                
                for analysis in analyses_array {
                    if let Some(analysis_obj) = analysis.as_object() {
                        if let Some(file_type) = analysis_obj.get("type") {
                            if let Some(type_str) = file_type.as_str() {
                                *type_counts.entry(type_str.to_string()).or_insert(0) += 1;
                            }
                        }
                        
                        if let Some(frame_count) = analysis_obj.get("frame_count") {
                            if let Some(count) = frame_count.as_u64() {
                                total_sprites += count;
                            }
                        }
                        
                        if let Some(key_count) = analysis_obj.get("key_count") {
                            if let Some(count) = key_count.as_u64() {
                                total_strings += count;
                            }
                        }
                    }
                }
                
                let type_counts_json: serde_json::Map<String, serde_json::Value> = type_counts
                    .into_iter()
                    .map(|(k, v)| (k, serde_json::Value::Number(serde_json::Number::from(v))))
                    .collect();
                
                summary.insert("file_types".to_string(), serde_json::Value::Object(type_counts_json));
                summary.insert("total_sprites".to_string(), serde_json::Value::Number(serde_json::Number::from(total_sprites)));
                summary.insert("total_strings".to_string(), serde_json::Value::Number(serde_json::Number::from(total_strings)));
                summary.insert("total_files_analyzed".to_string(), serde_json::Value::Number(serde_json::Number::from(analyses_array.len())));
            }
        }
        
        detailed_analysis.insert("summary".to_string(), serde_json::Value::Object(summary));
        
        // Write detailed report
        let report_path = self.output_path.join("web_analysis").join("reports").join("detailed_analysis.json");
        std::fs::write(&report_path, serde_json::to_string_pretty(&serde_json::Value::Object(detailed_analysis))?)?;
        
        Ok(())
    }

    fn generate_summary(&self) -> String {
        let mut summary = String::new();
        summary.push_str("=== WC2 Web Analysis Summary ===\n\n");
        
        summary.push_str(&format!("Total web pages analyzed: {}\n", self.web_pages.len()));
        summary.push_str(&format!("Total data points extracted: {}\n\n", self.extracted_data.len()));
        
        summary.push_str("Web Pages Found:\n");
        for (i, page) in self.web_pages.iter().enumerate() {
            summary.push_str(&format!("{}. {}\n", i + 1, page.file_path));
            if let Some(title) = &page.title {
                summary.push_str(&format!("   Title: {}\n", title));
            }
            summary.push_str(&format!("   Elements: {}\n", page.elements.len()));
            summary.push_str(&format!("   Scripts: {}\n", page.scripts.len()));
            summary.push_str(&format!("   Styles: {}\n", page.styles.len()));
            summary.push_str(&format!("   Meta data: {}\n", page.meta_data.len()));
            summary.push_str("\n");
        }
        
        summary.push_str("Data Categories Extracted:\n");
        for (category, _) in &self.extracted_data {
            summary.push_str(&format!("- {}\n", category));
        }
        
        summary
    }
}
