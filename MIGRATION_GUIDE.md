# 🔄 Migration Guide - Old to New Project Structure

## **📋 Overview**
This guide details the step-by-step process of migrating from the current scattered project structure to the new organized, workspace-based architecture.

## **🎯 Migration Goals**
- **Organize**: Group related functionality by game type
- **Modularize**: Create reusable shared libraries
- **Standardize**: Consistent project structure across all games
- **Future-proof**: Prepare for AI integration and cloud deployment

## **📁 Current vs. New Structure**

### **Current Structure (Scattered)**
```
wartest/
├── src/                           # Mixed WC1/WC2 functionality
├── WC2Replays/                    # WC2 replay system
├── W3ChampAnalysis/               # WC3 champions analysis
├── WCACore/                       # Tauri app
├── wartest-monitor/               # Old Tauri app
├── wartest-extractor/             # Asset extraction
├── WC1Assets/                     # Extracted assets
├── WC2Assets/                     # Extracted assets
└── games/                         # Game installations
```

### **New Structure (Organized)**
```
wartest/
├── games/WC1/                     # All WC1 projects
├── games/WC2/                     # All WC2 projects  
├── games/WC3/                     # All WC3 projects
├── apps/tauri-apps/wcacore/       # Main Tauri app
├── shared/                        # Shared libraries
└── games/                         # Game installations (unchanged)
```

## **🔄 Phase-by-Phase Migration**

### **Phase 2: WC2 Replay System Migration** 🎯

#### **Step 1: Move Directory**
```bash
# Move WC2Replays to new location
mv WC2Replays games/WC2/replay-system
```

#### **Step 2: Update Cargo.toml**
```toml
[package]
name = "wc2-replay-system"
version.workspace = true
edition.workspace = true
authors.workspace = true
description = "Warcraft II Remastered Replay Analysis System"
license.workspace = true

[dependencies]
# Use workspace dependencies
tokio.workspace = true
serde.workspace = true
serde_json.workspace = true
# ... other dependencies
```

#### **Step 3: Refactor Imports**
- Update module paths to use shared libraries
- Replace direct dependencies with workspace dependencies
- Update any hardcoded paths

#### **Step 4: Test Build**
```bash
cd games/WC2/replay-system
cargo build
```

### **Phase 3: WC3 Champions Analysis Migration**

#### **Step 1: Move Directory**
```bash
mv W3ChampAnalysis games/WC3/champions-analysis
```

#### **Step 2: Update Cargo.toml**
```toml
[package]
name = "wc3-champions-analysis"
version.workspace = true
edition.workspace = true
authors.workspace = true
description = "W3Champions Integration Analysis System"
license.workspace = true

[dependencies]
# Use workspace dependencies
tokio.workspace = true
windows.workspace = true
# ... other dependencies
```

#### **Step 3: Refactor Imports**
- Update module paths
- Replace dependencies with workspace versions
- Update any hardcoded paths

### **Phase 4: WC2 Multiplayer Monitor Migration**

#### **Step 1: Extract Multiplayer Code**
```bash
# Create new directory
mkdir -p games/WC2/multiplayer-monitor/src
mkdir -p games/WC2/multiplayer-monitor/tests
```

#### **Step 2: Move Source Files**
```bash
# Move multiplayer-specific code from root src/
cp src/multiplayer_monitor.rs games/WC2/multiplayer-monitor/src/
cp src/game_result_monitor.rs games/WC2/multiplayer-monitor/src/
# ... other multiplayer files
```

#### **Step 3: Create Cargo.toml**
```toml
[package]
name = "wc2-multiplayer-monitor"
version.workspace = true
edition.workspace = true
authors.workspace = true
description = "Warcraft II Multiplayer Game Monitoring"
license.workspace = true

[dependencies]
# Use workspace dependencies
tokio.workspace = true
windows.workspace = true
# ... other dependencies
```

### **Phase 5: WC1 Projects Migration**

#### **Step 1: Extract WC1 Code**
```bash
# Create directories
mkdir -p games/WC1/asset-extractor/src
mkdir -p games/WC1/game-analyzer/src
mkdir -p games/WC1/multiplayer-monitor/src
```

#### **Step 2: Move Source Files**
```bash
# Move WC1-specific code
cp src/wc1_extractor.rs games/WC1/asset-extractor/src/
# ... other WC1 files
```

#### **Step 3: Create Cargo.toml Files**
```toml
# games/WC1/asset-extractor/Cargo.toml
[package]
name = "wc1-asset-extractor"
version.workspace = true
edition.workspace = true
authors.workspace = true
description = "Warcraft I Asset Extraction System"
license.workspace = true

[dependencies]
# Use workspace dependencies
```

### **Phase 6: Tauri App Integration**

#### **Step 1: Move WCACore**
```bash
mv WCACore apps/tauri-apps/wcacore
```

#### **Step 2: Update Cargo.toml**
```toml
[package]
name = "wcacore"
version.workspace = true
edition.workspace = true
authors.workspace = true
description = "Warcraft Game Analysis Core Application"
license.workspace = true

[dependencies]
# Use workspace dependencies
# Add game-specific dependencies
wc2-replay-system = { path = "../../../games/WC2/replay-system" }
wc2-multiplayer-monitor = { path = "../../../games/WC2/multiplayer-monitor" }
wc3-champions-analysis = { path = "../../../games/WC3/champions-analysis" }
```

#### **Step 3: Integrate Game Functionality**
- Import game-specific modules
- Create unified game management interface
- Add navigation between different game systems

## **🔧 Shared Libraries Development**

### **Core Library Structure**
```
shared/core/
├── Cargo.toml
├── src/
│   ├── lib.rs
│   ├── game_engine/
│   ├── process_monitor/
│   └── memory_hooks/
```

### **Utils Library Structure**
```
shared/utils/
├── Cargo.toml
├── src/
│   ├── lib.rs
│   ├── file_ops/
│   ├── binary_parser/
│   └── asset_extraction/
```

### **Database Library Structure**
```
shared/database/
├── Cargo.toml
├── src/
│   ├── lib.rs
│   ├── schemas/
│   └── migrations/
```

## **⚠️ Migration Challenges & Solutions**

### **Challenge 1: Dependency Conflicts**
- **Problem**: Different versions of same dependency
- **Solution**: Use workspace dependencies for consistency

### **Challenge 2: Import Path Updates**
- **Problem**: Hardcoded import paths
- **Solution**: Systematic search and replace

### **Challenge 3: Build System Changes**
- **Problem**: Cargo workspace configuration
- **Solution**: Test builds after each migration phase

### **Challenge 4: Asset Paths**
- **Problem**: Hardcoded asset file paths
- **Solution**: Use relative paths from project root

## **✅ Migration Checklist**

### **Phase 2: WC2 Replay System**
- [ ] Move directory
- [ ] Update Cargo.toml
- [ ] Refactor imports
- [ ] Test build
- [ ] Update documentation

### **Phase 3: WC3 Champions Analysis**
- [ ] Move directory
- [ ] Update Cargo.toml
- [ ] Refactor imports
- [ ] Test build
- [ ] Update documentation

### **Phase 4: WC2 Multiplayer Monitor**
- [ ] Extract code
- [ ] Create new project
- [ ] Move source files
- [ ] Create Cargo.toml
- [ ] Test build

### **Phase 5: WC1 Projects**
- [ ] Extract WC1 code
- [ ] Create project structure
- [ ] Move source files
- [ ] Create Cargo.toml files
- [ ] Test builds

### **Phase 6: Tauri App Integration**
- [ ] Move WCACore
- [ ] Update dependencies
- [ ] Integrate game modules
- [ ] Test application
- [ ] Update documentation

## **🚀 Post-Migration Tasks**

1. **Clean Up**: Remove old directories and files
2. **Documentation**: Update all README files
3. **Testing**: Comprehensive testing of all migrated projects
4. **Performance**: Optimize build times and dependencies
5. **CI/CD**: Set up automated testing and building

## **📚 Additional Resources**

- [Rust Workspace Documentation](https://doc.rust-lang.org/cargo/reference/workspaces.html)
- [Cargo Dependencies](https://doc.rust-lang.org/cargo/reference/dependencies.html)
- [Project Structure Best Practices](https://doc.rust-lang.org/cargo/guide/project-layout.html)
