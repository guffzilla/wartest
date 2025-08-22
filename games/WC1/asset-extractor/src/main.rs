use clap::{Parser, Subcommand};
use anyhow::Result;
use tracing::{info, error};

mod extractor;
mod formats;
mod utils;

use extractor::WC1AssetExtractor;

#[derive(Parser)]
#[command(name = "wc1-asset-extractor")]
#[command(about = "Warcraft I Asset Extraction System")]
#[command(version)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Extract assets from Warcraft I game files
    Extract {
        /// Input directory containing game files
        #[arg(short, long)]
        input: String,
        
        /// Output directory for extracted assets
        #[arg(short, long)]
        output: String,
        
        /// Extract images
        #[arg(long)]
        images: bool,
        
        /// Extract audio
        #[arg(long)]
        audio: bool,
        
        /// Extract data files
        #[arg(long)]
        data: bool,
    },
    
    /// List available assets in game files
    List {
        /// Input directory containing game files
        #[arg(short, long)]
        input: String,
    },
}

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    tracing_subscriber::fmt::init();
    
    info!("Starting WC1 Asset Extractor...");
    
    let cli = Cli::parse();
    
    match cli.command {
        Commands::Extract { input, output, images, audio, data } => {
            info!("Extracting assets from: {} to: {}", input, output);
            // TODO: Implement extraction logic
            info!("Extraction started with images: {}, audio: {}, data: {}", images, audio, data);
        }
        
        Commands::List { input } => {
            info!("Listing assets in: {}", input);
            // TODO: Implement listing logic
        }
    }
    
    Ok(())
}
