#!/usr/bin/env python3
"""
PE File Analyzer for W3Champions
Analyzes Windows PE executables to extract information about imports, exports, and strings.
"""

import pefile
import struct
import re
import sys
import os
from pathlib import Path

class PEAnalyzer:
    def __init__(self, file_path):
        self.file_path = file_path
        self.pe = None
        self.analysis_results = {}
        
    def load_pe(self):
        """Load and parse the PE file."""
        try:
            self.pe = pefile.PE(self.file_path)
            return True
        except Exception as e:
            print(f"Error loading PE file: {e}")
            return False
    
    def analyze_basic_info(self):
        """Extract basic information about the PE file."""
        if not self.pe:
            return
            
        info = {
            'file_size': os.path.getsize(self.file_path),
            'machine': hex(self.pe.FILE_HEADER.Machine),
            'timestamp': self.pe.FILE_HEADER.TimeDateStamp,
            'characteristics': hex(self.pe.FILE_HEADER.Characteristics),
            'subsystem': hex(self.pe.OPTIONAL_HEADER.Subsystem),
            'dll_characteristics': hex(self.pe.OPTIONAL_HEADER.DllCharacteristics),
            'entry_point': hex(self.pe.OPTIONAL_HEADER.AddressOfEntryPoint),
            'image_base': hex(self.pe.OPTIONAL_HEADER.ImageBase),
            'sections': []
        }
        
        for section in self.pe.sections:
            info['sections'].append({
                'name': section.Name.decode().rstrip('\x00'),
                'virtual_address': hex(section.VirtualAddress),
                'virtual_size': hex(section.Misc_VirtualSize),
                'raw_address': hex(section.PointerToRawData),
                'raw_size': hex(section.SizeOfRawData),
                'characteristics': hex(section.Characteristics)
            })
            
        self.analysis_results['basic_info'] = info
    
    def analyze_imports(self):
        """Extract import information."""
        if not self.pe:
            return
            
        imports = []
        try:
            for entry in self.pe.DIRECTORY_ENTRY_IMPORT:
                dll_name = entry.dll.decode()
                functions = []
                for imp in entry.imports:
                    if imp.name:
                        functions.append(imp.name.decode())
                    elif imp.ordinal:
                        functions.append(f"Ordinal_{imp.ordinal}")
                
                imports.append({
                    'dll': dll_name,
                    'functions': functions
                })
        except AttributeError:
            print("No import directory found")
            
        self.analysis_results['imports'] = imports
    
    def analyze_exports(self):
        """Extract export information."""
        if not self.pe:
            return
            
        exports = []
        try:
            for exp in self.pe.DIRECTORY_ENTRY_EXPORT.symbols:
                if exp.name:
                    exports.append(exp.name.decode())
        except AttributeError:
            print("No export directory found")
            
        self.analysis_results['exports'] = exports
    
    def extract_strings(self, min_length=4):
        """Extract readable strings from the file."""
        if not self.pe:
            return
            
        strings = []
        string_pattern = re.compile(b'[ -~]{' + str(min_length).encode() + b',}')
        
        for section in self.pe.sections:
            try:
                data = section.get_data()
                matches = string_pattern.findall(data)
                for match in matches:
                    try:
                        string = match.decode('utf-8')
                        if string not in strings:
                            strings.append(string)
                    except UnicodeDecodeError:
                        continue
            except Exception as e:
                print(f"Error reading section {section.Name}: {e}")
                
        self.analysis_results['strings'] = strings
    
    def analyze_resources(self):
        """Analyze resource directory."""
        if not self.pe:
            return
            
        resources = []
        try:
            for resource_type in self.pe.DIRECTORY_ENTRY_RESOURCE.entries:
                for resource_id in resource_type.directory.entries:
                    for resource_lang in resource_id.directory.entries:
                        resources.append({
                            'type': resource_type.name if hasattr(resource_type, 'name') else hex(resource_type.id),
                            'id': resource_id.name if hasattr(resource_id, 'name') else hex(resource_id.id),
                            'lang': hex(resource_lang.id),
                            'offset': hex(resource_lang.data.struct.OffsetToData),
                            'size': hex(resource_lang.data.struct.Size)
                        })
        except AttributeError:
            print("No resource directory found")
            
        self.analysis_results['resources'] = resources
    
    def save_analysis(self, output_file):
        """Save analysis results to a file."""
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write("W3Champions PE Analysis Report\n")
            f.write("=" * 50 + "\n\n")
            
            # Basic Info
            if 'basic_info' in self.analysis_results:
                f.write("BASIC INFORMATION\n")
                f.write("-" * 20 + "\n")
                info = self.analysis_results['basic_info']
                f.write(f"File Size: {info['file_size']:,} bytes\n")
                f.write(f"Machine: {info['machine']}\n")
                f.write(f"Subsystem: {info['subsystem']}\n")
                f.write(f"Entry Point: {info['entry_point']}\n")
                f.write(f"Image Base: {info['image_base']}\n\n")
                
                f.write("SECTIONS\n")
                f.write("-" * 10 + "\n")
                for section in info['sections']:
                    f.write(f"{section['name']}: VA={section['virtual_address']}, Size={section['virtual_size']}\n")
                f.write("\n")
            
            # Imports
            if 'imports' in self.analysis_results:
                f.write("IMPORTS\n")
                f.write("-" * 10 + "\n")
                for imp in self.analysis_results['imports']:
                    f.write(f"{imp['dll']}:\n")
                    for func in imp['functions'][:10]:  # Limit to first 10 functions
                        f.write(f"  {func}\n")
                    if len(imp['functions']) > 10:
                        f.write(f"  ... and {len(imp['functions']) - 10} more\n")
                    f.write("\n")
            
            # Exports
            if 'exports' in self.analysis_results:
                f.write("EXPORTS\n")
                f.write("-" * 10 + "\n")
                for exp in self.analysis_results['exports']:
                    f.write(f"{exp}\n")
                f.write("\n")
            
            # Resources
            if 'resources' in self.analysis_results:
                f.write("RESOURCES\n")
                f.write("-" * 12 + "\n")
                for res in self.analysis_results['resources']:
                    f.write(f"Type: {res['type']}, ID: {res['id']}, Lang: {res['lang']}\n")
                f.write("\n")
            
            # Strings (sample)
            if 'strings' in self.analysis_results:
                f.write("STRINGS (Sample)\n")
                f.write("-" * 18 + "\n")
                interesting_strings = [s for s in self.analysis_results['strings'] 
                                     if any(keyword in s.lower() for keyword in 
                                           ['w3c', 'champion', 'warcraft', 'http', 'api', 'json'])]
                for string in interesting_strings[:50]:
                    f.write(f"{string}\n")
                f.write(f"\nTotal strings found: {len(self.analysis_results['strings'])}\n")
    
    def run_analysis(self):
        """Run complete analysis."""
        if not self.load_pe():
            return False
            
        print("Analyzing PE file...")
        self.analyze_basic_info()
        self.analyze_imports()
        self.analyze_exports()
        self.extract_strings()
        self.analyze_resources()
        
        return True

def main():
    if len(sys.argv) != 2:
        print("Usage: python pe_analyzer.py <pe_file>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        sys.exit(1)
    
    analyzer = PEAnalyzer(file_path)
    if analyzer.run_analysis():
        output_file = Path(file_path).stem + "_analysis.txt"
        analyzer.save_analysis(output_file)
        print(f"Analysis saved to: {output_file}")
    else:
        print("Analysis failed")

if __name__ == "__main__":
    main()
