# 🚀 Quick Start Guide: WC2 Remastered Reverse Engineering

**Status**: READY TO BEGIN ANALYSIS
**Estimated Time**: 2-4 hours for initial exploration
**Goal**: Identify critical functions for headless modification

## ⚡ **Get Started in 5 Minutes**

### **Step 1: Download Ghidra (Free)**
1. Go to: https://ghidra-sre.org/
2. Download the latest version for Windows
3. Install and launch Ghidra

### **Step 2: Create Project**
1. **File → New Project**
2. **Project Name**: `WC2-Remastered-Analysis`
3. **Project Location**: Choose your preferred folder
4. **Click Finish**

### **Step 3: Import Executable**
1. **File → Import File**
2. **Navigate to**: `custom_wc2_build/original_files/x86/Warcraft II.exe`
3. **Click OK**
4. **Accept defaults** for import options

### **Step 4: Run Analysis**
1. **Analysis → One Shot → Analyze**
2. **Accept all defaults**
3. **Click OK**
4. **Wait for analysis to complete** (may take 5-10 minutes)

### **Step 5: Run Our Script**
1. **File → Run Script**
2. **Select**: `tools/analyze_wc2.py`
3. **Click Run**
4. **Check output** in the console

## 🔍 **What to Look For**

### **Immediate Targets (First 30 minutes)**
- **Entry Point**: Look for `main()` or `WinMain()`
- **Game Loop**: Search for functions with "loop", "update", "frame"
- **Rendering**: Look for OpenGL calls or window creation

### **Secondary Targets (Next hour)**
- **Networking**: Search for "connect", "socket", "auth"
- **Input**: Look for "mouse", "keyboard", "input"
- **Game State**: Search for "unit", "building", "resource"

## 📝 **Documentation Template**

As you find functions, document them like this:

```
Function: [NAME] at 0x[ADDRESS]
Type: [Game Loop/Rendering/Networking/Input/Game State]
Purpose: [Brief description]
Modification Plan: [How to make it headless]
```

## 🎯 **Success Criteria for First Session**

- [ ] **Entry point identified** and documented
- [ ] **At least 3 critical functions** found and mapped
- [ ] **Basic understanding** of program structure
- [ ] **Modification targets** identified for headless operation

## 🚨 **Common Issues & Solutions**

### **"No program loaded" error**
- Make sure you've imported the executable first
- Check that analysis has completed

### **Script not running**
- Ensure you're using the Python script from our tools folder
- Check that Ghidra has finished initial analysis

### **Can't find functions**
- Try different search terms (e.g., "loop", "update", "render")
- Look in the Symbol Table (Window → Symbol Table)
- Check the Function Manager (Window → Function Manager)

## 🔧 **Advanced Tips**

### **Use Symbol Table**
- **Window → Symbol Table**
- Look for functions with descriptive names
- Focus on functions with "Game", "Render", "Network" in the name

### **Cross-Reference Analysis**
- Right-click on a function → **References → Show References**
- This shows what calls the function and what it calls

### **Data Structure Analysis**
- Look for large data structures
- Focus on structures that might contain game state

## 📊 **Progress Tracking**

Track your progress in the `analysis_report.md` file:
- Update the checkboxes as you complete sections
- Add detailed function analysis
- Document your insights and observations

## 🎉 **You're Ready!**

1. **Download Ghidra**
2. **Import the executable**
3. **Run the analysis script**
4. **Start exploring and documenting**

**Remember**: Every function you find brings us closer to creating the headless version!

---

**Need Help?** Check the main `analysis_report.md` for detailed guidance.
**Safety Note**: We're only analyzing - no modifications yet!
