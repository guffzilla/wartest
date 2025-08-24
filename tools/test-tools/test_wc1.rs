use wartest::wc1_extractor::WC1Extractor;

fn main() {
    println!("Testing WC1 extractor...");
    
    let mut extractor = WC1Extractor::new(
        "games/Warcraft I Remastered/x86",
        "WC1Assets_test"
    );
    
    match extractor.extract_all() {
        Ok(()) => println!("WC1 extraction completed successfully!"),
        Err(e) => println!("WC1 extraction failed: {}", e),
    }
}
