use std::fs;
use std::path::Path;
use clap::Parser;
use anyhow::Result;
use tracing::{info, error};

mod analyzer;
mod structures;

use analyzer::BinaryAnalyzer;

#[derive(Parser)]
#[command(name = "wc2-analyzer")]
#[command(about = "Analyze WC2 Remastered replay files")]
struct Args {
    /// Path to WC2 Remastered Data folder
    #[arg(short, long, default_value = "games/Warcraft II Remastered/Data")]
    data_path: String,

    /// Analyze specific file
    #[arg(short, long)]
    file: Option<String>,

    /// Output analysis to JSON file
    #[arg(short, long)]
    output: Option<String>,

    /// Verbose output
    #[arg(short, long)]
    verbose: bool,
}

fn main() -> Result<()> {
    // Initialize logging
    tracing_subscriber::fmt::init();

    let args = Args::parse();
    
    info!("WC2 Remastered Replay File Analyzer");
    info!("Analyzing data path: {}", args.data_path);

    let analyzer = BinaryAnalyzer::new();
    let data_path = Path::new(&args.data_path);

    if !data_path.exists() {
        error!("Data path does not exist: {}", args.data_path);
        return Ok(());
    }

    if let Some(file_path) = args.file {
        // Analyze specific file
        analyze_single_file(&analyzer, &file_path, args.verbose)?;
    } else {
        // Analyze entire data directory
        analyze_data_directory(&analyzer, data_path, args.verbose)?;
    }

    Ok(())
}

fn analyze_single_file(analyzer: &BinaryAnalyzer, file_path: &str, verbose: bool) -> Result<()> {
    info!("Analyzing single file: {}", file_path);
    
    let analysis = analyzer.analyze_file(file_path)?;
    
    if verbose {
        println!("{}", serde_json::to_string_pretty(&analysis)?);
    } else {
        println!("File: {}", analysis.filename);
        println!("Size: {} bytes", analysis.file_size);
        println!("Type: {:?}", analysis.file_type);
        println!("Hash: {}", analysis.file_hash);
        
        if let Some(header) = analysis.header {
            println!("Header: {:?}", header);
        }
        
        if let Some(patterns) = analysis.patterns {
            println!("Patterns found: {}", patterns.len());
        }
    }

    Ok(())
}

fn analyze_data_directory(analyzer: &BinaryAnalyzer, data_path: &Path, verbose: bool) -> Result<()> {
    info!("Analyzing data directory: {:?}", data_path);

    let mut total_files = 0;
    let mut total_size = 0u64;

    // Analyze w2r files
    let w2r_path = data_path.join("w2r");
    if w2r_path.exists() {
        info!("Analyzing w2r directory...");
        let w2r_files = fs::read_dir(&w2r_path)?;
        
        for entry in w2r_files {
            let entry = entry?;
            let path = entry.path();
            
            if path.is_file() && path.extension().map_or(false, |ext| ext == "idx") {
                total_files += 1;
                
                let analysis = analyzer.analyze_file(path.to_str().unwrap())?;
                total_size += analysis.file_size;
                
                if verbose {
                    println!("W2R File: {}", analysis.filename);
                    println!("  Size: {} bytes", analysis.file_size);
                    println!("  Hash: {}", analysis.file_hash);
                    if let Some(header) = analysis.header {
                        println!("  Header: {:?}", header);
                    }
                } else {
                    println!("W2R: {} ({} bytes)", analysis.filename, analysis.file_size);
                }
            }
        }
    }

    // Analyze index files
    let indices_path = data_path.join("indices");
    if indices_path.exists() {
        info!("Analyzing indices directory...");
        let index_files = fs::read_dir(&indices_path)?;
        
        for entry in index_files {
            let entry = entry?;
            let path = entry.path();
            
            if path.is_file() && path.extension().map_or(false, |ext| ext == "index") {
                total_files += 1;
                
                let analysis = analyzer.analyze_file(path.to_str().unwrap())?;
                total_size += analysis.file_size;
                
                if verbose {
                    println!("Index File: {}", analysis.filename);
                    println!("  Size: {} bytes", analysis.file_size);
                    println!("  Hash: {}", analysis.file_hash);
                } else {
                    println!("Index: {} ({} bytes)", analysis.filename, analysis.file_size);
                }
            }
        }
    }

    // Analyze data files
    let data_files_path = data_path.join("data");
    if data_files_path.exists() {
        info!("Analyzing data files...");
        let data_files = fs::read_dir(&data_files_path)?;
        
        for entry in data_files {
            let entry = entry?;
            let path = entry.path();
            
            if path.is_file() {
                total_files += 1;
                
                let analysis = analyzer.analyze_file(path.to_str().unwrap())?;
                total_size += analysis.file_size;
                
                if verbose {
                    println!("Data File: {}", analysis.filename);
                    println!("  Size: {} bytes", analysis.file_size);
                    println!("  Hash: {}", analysis.file_hash);
                } else {
                    println!("Data: {} ({} bytes)", analysis.filename, analysis.file_size);
                }
            }
        }
    }

    println!("\n=== Analysis Summary ===");
    println!("Total files analyzed: {}", total_files);
    println!("Total size: {} bytes ({:.2} MB)", total_size, total_size as f64 / 1024.0 / 1024.0);
    println!("Average file size: {:.2} KB", total_size as f64 / total_files as f64 / 1024.0);

    Ok(())
}
