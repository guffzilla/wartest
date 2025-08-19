mod file_parsers;
mod asset_extractors;
mod game_analysis;
mod utils;
pub mod wc1_extractor;
pub mod wc2_extractor;

use clap::{Parser, Subcommand};
use anyhow::Result;
use tracing::{info, error, Level};
use tracing_subscriber;
use std::path::Path;

#[derive(Parser)]
#[command(name = "wartest")]
#[command(about = "Warcraft I and II game file analysis tool")]
#[command(version = "0.1.0")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Analyze game files and extract information
    Analyze {
        /// Path to the game directory
        #[arg(short, long)]
        path: String,
        
        /// Output directory for extracted files
        #[arg(short, long, default_value = "output")]
        output: String,
        
        /// File types to analyze (grp, json, idx, bin, all)
        #[arg(short, long, default_value = "all")]
        types: String,
    },
    
    /// Extract sprites from GRP files
    ExtractSprites {
        /// Path to GRP file or directory
        #[arg(short, long)]
        path: String,
        
        /// Output directory for PNG files
        #[arg(short, long, default_value = "sprites")]
        output: String,
    },
    
    /// Parse JSON configuration files
    ParseConfig {
        /// Path to JSON file or directory
        #[arg(short, long)]
        path: String,
        
        /// Output file for parsed data
        #[arg(short, long, default_value = "config_analysis.json")]
        output: String,
    },
    
    /// Scan directory for supported file types
    Scan {
        /// Path to scan
        #[arg(short, long)]
        path: String,
    },
    
    /// Extract all WC1 assets for MongoDB
    ExtractWC1 {
        /// Path to WC1 game directory
        #[arg(short, long)]
        path: String,
        
        /// Output directory for extracted assets
        #[arg(short, long, default_value = "WC1Assets")]
        output: String,
    },
    
    /// Test WC1 extraction (headless)
    TestWC1 {
        /// Path to WC1 game directory
        #[arg(short, long)]
        path: String,
        
        /// Output directory for extracted assets
        #[arg(short, long, default_value = "WC1Assets_test")]
        output: String,
    },
    
    /// Extract all WC2 assets for MongoDB
    ExtractWC2 {
        /// Path to WC2 game directory
        #[arg(short, long)]
        path: String,
        
        /// Output directory for extracted assets
        #[arg(short, long, default_value = "WC2Assets")]
        output: String,
    },
    
    /// Test WC2 extraction (headless)
    TestWC2 {
        /// Path to WC2 game directory
        #[arg(short, long)]
        path: String,
        
        /// Output directory for extracted assets
        #[arg(short, long, default_value = "WC2Assets_test")]
        output: String,
    },
}

fn main() -> Result<()> {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_max_level(Level::INFO)
        .init();

    let cli = Cli::parse();

    match cli.command {
        Commands::Analyze { path, output, types } => {
            info!("Starting analysis of: {}", path);
            analyze_game_files(&path, &output, &types)?;
        }
        Commands::ExtractSprites { path, output } => {
            info!("Extracting sprites from: {}", path);
            extract_sprites(&path, &output)?;
        }
        Commands::ParseConfig { path, output } => {
            info!("Parsing configuration from: {}", path);
            parse_config_files(&path, &output)?;
        }
        Commands::Scan { path } => {
            info!("Scanning directory: {}", path);
            scan_directory(&path)?;
        }
        Commands::ExtractWC1 { path, output } => {
            info!("Extracting WC1 assets from: {}", path);
            extract_wc1_assets(&path, &output)?;
        }
        Commands::TestWC1 { path, output } => {
            println!("Testing WC1 extraction (headless)...");
            test_wc1_extraction(&path, &output)?;
        }
        Commands::ExtractWC2 { path, output } => {
            info!("Extracting WC2 assets from: {}", path);
            extract_wc2_assets(&path, &output)?;
        }
        Commands::TestWC2 { path, output } => {
            println!("Testing WC2 extraction (headless)...");
            test_wc2_extraction(&path, &output)?;
        }
    }

    Ok(())
}

fn analyze_game_files(game_path: &str, output_path: &str, file_types: &str) -> Result<()> {
    use std::path::Path;
    use walkdir::WalkDir;
    use indicatif::{ProgressBar, ProgressStyle};

    let game_dir = Path::new(game_path);
    if !game_dir.exists() {
        anyhow::bail!("Game directory does not exist: {}", game_path);
    }

    // Create output directory
    std::fs::create_dir_all(output_path)?;

    // Find all files
    let files: Vec<_> = WalkDir::new(game_dir)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .collect();

    let progress_bar = ProgressBar::new(files.len() as u64);
    progress_bar.set_style(
        ProgressStyle::default_bar()
            .template("{spinner:.green} [{elapsed_precise}] [{bar:40.cyan/blue}] {pos}/{len} ({eta})")
            .unwrap()
    );

    let mut analyzed_count = 0;
    let mut error_count = 0;

    for entry in files {
        let file_path = entry.path();
        let file_name = file_path.file_name().unwrap_or_default().to_string_lossy();
        
        progress_bar.set_message(format!("Analyzing: {}", file_name));

        if let Err(e) = analyze_single_file(file_path, output_path, file_types) {
            error!("Failed to analyze {}: {}", file_path.display(), e);
            error_count += 1;
        } else {
            analyzed_count += 1;
        }

        progress_bar.inc(1);
    }

    progress_bar.finish_with_message("Analysis complete");

    info!("Analysis complete: {} files analyzed, {} errors", analyzed_count, error_count);
    Ok(())
}

fn analyze_single_file(file_path: &Path, output_path: &str, file_types: &str) -> Result<()> {
    use crate::file_parsers::{FileFormat, FileParser, grp_parser::GrpParser, json_parser::JsonParser, idx_parser::IdxParser, bin_parser::BinParser};

    let format = FileFormat::from_extension(file_path);
    
    // Check if we should process this file type
    if file_types != "all" && !file_types.contains(&format.to_string().to_lowercase()) {
        return Ok(());
    }

    match format {
        FileFormat::Grp => {
            let parser = GrpParser;
            if parser.can_parse(file_path) {
                let sprite = parser.parse(file_path)?;
                let info = parser.extract_info(&sprite);
                info!("{}: {}", file_path.display(), info);
                
                // Save as PNG
                let output_file = format!("{}/{}_sprite.png", 
                    output_path, 
                    file_path.file_stem().unwrap().to_string_lossy());
                parser.to_png(&sprite, Path::new(&output_file))?;
            }
        }
        FileFormat::Json => {
            let parser = JsonParser;
            if parser.can_parse(file_path) {
                let config = parser.parse(file_path)?;
                let strings = parser.extract_unit_info(&config);
                info!("{}: Found {} unit entries", file_path.display(), strings.len());
            }
        }
        FileFormat::Idx => {
            let parser = IdxParser;
            if parser.can_parse(file_path) {
                let idx_file = parser.parse(file_path)?;
                let info = parser.extract_info(&idx_file);
                info!("{}: {}", file_path.display(), info);
            }
        }
        FileFormat::Bin => {
            let parser = BinParser;
            if parser.can_parse(file_path) {
                let bin_file = parser.parse(file_path)?;
                let info = parser.extract_info(&bin_file);
                info!("{}: {}", file_path.display(), info);
            }
        }
        _ => {
            // Skip unsupported formats
        }
    }

    Ok(())
}

fn extract_sprites(input_path: &str, output_path: &str) -> Result<()> {
    use std::path::Path;
    use walkdir::WalkDir;
    use crate::file_parsers::{FileParser, grp_parser::GrpParser};

    let input_dir = Path::new(input_path);
    let output_dir = Path::new(output_path);

    std::fs::create_dir_all(output_dir)?;

    let parser = GrpParser;
    let mut extracted_count = 0;

    if input_dir.is_file() {
        // Single file
        if parser.can_parse(input_dir) {
            let sprite = parser.parse(input_dir)?;
            let output_file = output_dir.join(format!("{}_sprite.png", 
                input_dir.file_stem().unwrap().to_string_lossy()));
            parser.to_png(&sprite, &output_file)?;
            extracted_count += 1;
            info!("Extracted: {}", output_file.display());
        }
    } else {
        // Directory
        for entry in WalkDir::new(input_dir)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| e.file_type().is_file()) {
            
            let file_path = entry.path();
            if parser.can_parse(file_path) {
                match parser.parse(file_path) {
                    Ok(sprite) => {
                        let output_file = output_dir.join(format!("{}_sprite.png", 
                            file_path.file_stem().unwrap().to_string_lossy()));
                        if let Err(e) = parser.to_png(&sprite, &output_file) {
                            error!("Failed to extract {}: {}", file_path.display(), e);
                        } else {
                            extracted_count += 1;
                            info!("Extracted: {}", output_file.display());
                        }
                    }
                    Err(e) => {
                        error!("Failed to parse {}: {}", file_path.display(), e);
                    }
                }
            }
        }
    }

    info!("Extracted {} sprites to {}", extracted_count, output_path);
    Ok(())
}

fn parse_config_files(input_path: &str, output_path: &str) -> Result<()> {
    use std::path::Path;
    use walkdir::WalkDir;
    use crate::file_parsers::{FileParser, json_parser::JsonParser};
    use serde_json;

    let input_dir = Path::new(input_path);
    let output_file = Path::new(output_path);

    let parser = JsonParser;
    let mut configs = Vec::new();

    if input_dir.is_file() {
        // Single file
        if parser.can_parse(input_dir) {
            let config = parser.parse(input_dir)?;
            configs.push((input_dir.to_string_lossy().to_string(), config));
        }
    } else {
        // Directory
        for entry in WalkDir::new(input_dir)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| e.file_type().is_file()) {
            
            let file_path = entry.path();
            if parser.can_parse(file_path) {
                match parser.parse(file_path) {
                    Ok(config) => {
                        configs.push((file_path.to_string_lossy().to_string(), config));
                    }
                    Err(e) => {
                        error!("Failed to parse {}: {}", file_path.display(), e);
                    }
                }
            }
        }
    }

    // Save combined analysis
    let analysis = serde_json::json!({
        "files_analyzed": configs.len(),
        "configurations": configs
    });

    std::fs::write(output_file, serde_json::to_string_pretty(&analysis)?)?;
    info!("Configuration analysis saved to: {}", output_file.display());

    Ok(())
}

fn scan_directory(path: &str) -> Result<()> {
    use std::path::Path;
    use walkdir::WalkDir;
    use crate::file_parsers::FileFormat;
    use std::collections::HashMap;

    let dir = Path::new(path);
    if !dir.exists() {
        anyhow::bail!("Directory does not exist: {}", path);
    }

    let mut file_types: HashMap<FileFormat, usize> = HashMap::new();
    let mut total_files = 0;

    for entry in WalkDir::new(dir)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file()) {
        
        let file_path = entry.path();
        let format = FileFormat::from_extension(file_path);
        
        *file_types.entry(format).or_insert(0) += 1;
        total_files += 1;
    }

    info!("Directory scan results for: {}", path);
    info!("Total files: {}", total_files);
    
    for (format, count) in file_types.iter() {
        if *count > 0 {
            info!("  {:?}: {} files", format, count);
        }
    }

    Ok(())
}

fn extract_wc1_assets(game_path: &str, output_path: &str) -> Result<()> {
    use crate::wc1_extractor::WC1Extractor;
    
    let mut extractor = WC1Extractor::new(game_path, output_path);
    extractor.extract_all()?;
    
    info!("WC1 asset extraction completed successfully!");
    info!("Output directory: {}", output_path);
    
    Ok(())
}

fn test_wc1_extraction(game_path: &str, output_path: &str) -> Result<()> {
    use crate::wc1_extractor::WC1Extractor;
    
    println!("Starting headless WC1 extraction test...");
    println!("Game path: {}", game_path);
    println!("Output path: {}", output_path);
    
    let mut extractor = WC1Extractor::new(game_path, output_path);
    
    match extractor.extract_all() {
        Ok(()) => {
            println!("✅ WC1 extraction completed successfully!");
            println!("📁 Check output directory: {}", output_path);
            
            // List what was extracted
            let output_dir = std::path::Path::new(output_path);
            if output_dir.exists() {
                println!("📂 Output directory contents:");
                for entry in std::fs::read_dir(output_dir)? {
                    let entry = entry?;
                    let path = entry.path();
                    if path.is_dir() {
                        let count = std::fs::read_dir(&path)?.count();
                        println!("  📁 {}: {} items", path.file_name().unwrap().to_string_lossy(), count);
                    } else {
                        let size = path.metadata()?.len();
                        println!("  📄 {}: {} bytes", path.file_name().unwrap().to_string_lossy(), size);
                    }
                }
            }
        }
        Err(e) => {
            println!("❌ WC1 extraction failed: {}", e);
            return Err(e);
        }
    }
    
    Ok(())
}

fn extract_wc2_assets(game_path: &str, output_path: &str) -> Result<()> {
    use crate::wc2_extractor::WC2Extractor;
    
    let mut extractor = WC2Extractor::new(game_path, output_path);
    extractor.extract_all()?;
    
    info!("WC2 asset extraction completed successfully!");
    info!("Output directory: {}", output_path);
    
    Ok(())
}

fn test_wc2_extraction(game_path: &str, output_path: &str) -> Result<()> {
    use crate::wc2_extractor::WC2Extractor;
    
    println!("Starting headless WC2 extraction test...");
    println!("Game path: {}", game_path);
    println!("Output path: {}", output_path);
    
    let mut extractor = WC2Extractor::new(game_path, output_path);
    
    match extractor.extract_all() {
        Ok(()) => {
            println!("✅ WC2 extraction completed successfully!");
            println!("📁 Check output directory: {}", output_path);
            
            // List what was extracted
            let output_dir = std::path::Path::new(output_path);
            if output_dir.exists() {
                println!("📂 Output directory contents:");
                for entry in std::fs::read_dir(output_dir)? {
                    let entry = entry?;
                    let path = entry.path();
                    if path.is_dir() {
                        let count = std::fs::read_dir(&path)?.count();
                        println!("  📁 {}: {} items", path.file_name().unwrap().to_string_lossy(), count);
                    } else {
                        let size = path.metadata()?.len();
                        println!("  📄 {}: {} bytes", path.file_name().unwrap().to_string_lossy(), size);
                    }
                }
            }
        }
        Err(e) => {
            println!("❌ WC2 extraction failed: {}", e);
            return Err(e);
        }
    }
    
    Ok(())
}
