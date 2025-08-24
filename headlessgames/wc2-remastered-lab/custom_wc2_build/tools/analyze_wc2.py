# Ghidra Analysis Script for WC2 Remastered
# This script helps identify key functions and structures

from ghidra.app.decompiler import DecompInterface
from ghidra.program.model.symbol import SymbolType

def main():
    print("Starting analysis of WC2 Remastered...")
    
    # Get current program
    program = getCurrentProgram()
    if program is None:
        print("No program loaded!")
        return
    
    # Find main entry point
    main_symbol = find_symbol_by_name(program, "main")
    if main_symbol:
        print(f"Main entry point found at: {main_symbol.address}")
    
    # Find WinMain
    winmain_symbol = find_symbol_by_name(program, "WinMain")
    if winmain_symbol:
        print(f"WinMain found at: {winmain_symbol.address}")
    
    # Look for common game functions
    find_game_functions(program)
    
    # Look for rendering functions
    find_rendering_functions(program)
    
    # Look for networking functions
    find_networking_functions(program)
    
    print("Analysis complete!")

def find_symbol_by_name(program, name):
    symbol_table = program.getSymbolTable()
    symbols = symbol_table.getSymbols(name)
    if symbols.hasNext():
        return symbols.next()
    return None

def find_game_functions(program):
    game_patterns = [
        "GameLoop",
        "UpdateGame", 
        "ProcessInput",
        "RenderFrame"
    ]
    
    for pattern in game_patterns:
        symbol = find_symbol_by_name(program, pattern)
        if symbol:
            print(f"Found game function {pattern} at {symbol.address}")

def find_rendering_functions(program):
    render_patterns = [
        "glBegin",
        "glEnd",
        "glVertex",
        "CreateWindow",
        "ShowWindow"
    ]
    
    for pattern in render_patterns:
        symbol = find_symbol_by_name(program, pattern)
        if symbol:
            print(f"Found rendering function {pattern} at {symbol.address}")

def find_networking_functions(program):
    network_patterns = [
        "connect",
        "send",
        "recv",
        "WSAStartup",
        "socket"
    ]
    
    for pattern in network_patterns:
        symbol = find_symbol_by_name(program, pattern)
        if symbol:
            print(f"Found network function {pattern} at {symbol.address}")

if __name__ == "__main__":
    main()
