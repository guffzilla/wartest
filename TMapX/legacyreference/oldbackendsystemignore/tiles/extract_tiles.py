
import os
import sys
try:
    from mpyq import MPQArchive
except ImportError:
    print("mpyq not available")
    sys.exit(1)

mpq_path = r"C:\\Users\\garet\\OneDrive\\Desktop\\newsite\\War2Combat\\War2Dat.mpq"
output_dir = r"C:\\Users\\garet\\OneDrive\\Desktop\\newsite\\backend\\tiles"

try:
    archive = MPQArchive(mpq_path)
    
    # Look for tileset files
    tile_extensions = ['.grp', '.pcx', '.bmp']
    extracted_count = 0
    
    for filename in archive.files:
        name_lower = filename.lower()
        
        # Extract tileset-related files
        if any(name_lower.endswith(ext) for ext in tile_extensions):
            try:
                file_data = archive.open(filename).read()
                output_path = os.path.join(output_dir, filename.replace('\\', '_'))
                os.makedirs(os.path.dirname(output_path), exist_ok=True)
                
                with open(output_path, 'wb') as f:
                    f.write(file_data)
                extracted_count += 1
                print(f"Extracted: {filename}")
                
            except Exception as e:
                print(f"Failed to extract {filename}: {e}")
    
    print(f"Extracted {extracted_count} files")
    
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
