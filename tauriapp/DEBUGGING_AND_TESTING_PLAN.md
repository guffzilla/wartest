# WCArena Monitor - Debugging and Testing Plan

## Current Status Analysis (Updated: Current Session)

### ✅ What's Working
- App builds successfully
- App launches and shows frontend
- Tauri commands are properly registered in `main.rs`
- Basic HTML structure exists
- Testing functions implemented (but not accessible due to build issue)
- Error handling improved
- Build automation created

### ❌ What's Broken
- **Frontend build failure** - JavaScript assets not being built for production
- Tauri API communication (`invoke()` returns `undefined`)
- DOM element access failures
- Mock function fallbacks active
- Testing functions unavailable (`runAllTests()` is undefined)

## Root Cause Analysis (Updated: Current Session)

### 1. Frontend Build Failure (NEW - PRIMARY ISSUE)
**Problem**: JavaScript functions like `runAllTests()` are undefined
**Root Cause**: Frontend JavaScript assets are not being built for production
**Evidence**: `dist` folder contains only static HTML files, no JavaScript assets
**Impact**: All JavaScript functionality is missing, including our testing suite

### 2. Tauri API Communication Issue
**Problem**: `window.__TAURI__.invoke()` returns `undefined` for all commands
**Root Cause**: The Tauri context is not properly initialized or the frontend can't access the backend

**Evidence**:
- Commands are properly registered in `main.rs`:
  ```rust
  .invoke_handler(tauri::generate_handler![
      scan_for_games,
      locate_games,
      add_game_manually,
      scan_folder_for_games,
      get_launcher_info,
      get_map_folders,
      open_folder_dialog,
      open_external_url,
      open_wc_arena_app
  ])
  ```
- Frontend calls `invoke('scan_for_games')` but gets `undefined`
- Mock functions are triggered as fallback

### 2. DOM Element Mismatches
**Problem**: JavaScript can't find expected HTML elements
**Root Cause**: HTML structure doesn't match JavaScript expectations

**Missing Elements**:
- `launcher-container` - Referenced in JavaScript but not in HTML
- `game-list` - Referenced in JavaScript but not in HTML  
- `status-display` - Referenced in JavaScript but not in HTML

**Existing Elements**:
- `launcher-info` ✅ (line 747)
- `launcher-grid` ✅ (line 749)

## Immediate Debugging Steps

### Step 1: Test Tauri API Access
Open browser dev tools in the running app and test:

```javascript
// Test 1: Check if Tauri is available
console.log('Tauri available:', window.__TAURI__);

// Test 2: Check available commands
console.log('Available commands:', window.__TAURI__?.commands);

// Test 3: Test command invocation
try {
    const result = await window.__TAURI__.invoke('get_launcher_info');
    console.log('Command result:', result);
} catch (error) {
    console.error('Command error:', error);
}
```

### Step 2: Verify HTML Structure
Check what elements actually exist:

```javascript
// Test DOM structure
const requiredElements = [
    'launcher-info',
    'launcher-grid',
    'game-list',
    'status-display'
];

requiredElements.forEach(id => {
    const element = document.getElementById(id);
    console.log(`${id}:`, element ? 'EXISTS' : 'MISSING');
});
```

### Step 3: Check Tauri Context
Verify the app is running in the correct Tauri context:

```javascript
// Check if we're in a Tauri app
console.log('Window location:', window.location.href);
console.log('Tauri version:', window.__TAURI__?.version);
console.log('App config:', window.__TAURI__?.config);
```

## Testing Strategy Implementation

### Phase 1: Backend Command Testing

#### Test 1: Command Registration
```rust
#[cfg(test)]
mod command_tests {
    use super::*;
    
    #[test]
    fn test_command_registration() {
        // This test will verify commands are properly registered
        // We'll implement this after fixing the basic issues
    }
}
```

#### Test 2: Command Functionality
```rust
#[test]
fn test_get_launcher_info() {
    // Test launcher detection logic
    let result = get_launcher_info();
    assert!(result.is_ok());
}

#[test]
fn test_scan_for_games() {
    // Test game scanning logic
    let result = scan_for_games();
    assert!(result.is_ok());
}
```

### Phase 2: Frontend Integration Testing

#### Test 1: DOM Structure Validation
```javascript
// Add this to index.html for testing
function validateDOMStructure() {
    const required = {
        'launcher-info': 'Launcher information container',
        'launcher-grid': 'Launcher grid display',
        'game-list': 'Game list container',
        'status-display': 'Status display area'
    };
    
    const missing = [];
    
    Object.entries(required).forEach(([id, description]) => {
        const element = document.getElementById(id);
        if (!element) {
            missing.push(`${id} (${description})`);
        }
    });
    
    if (missing.length > 0) {
        console.error('Missing required DOM elements:', missing);
        return false;
    }
    
    console.log('✅ All required DOM elements found');
    return true;
}
```

#### Test 2: Tauri API Testing
```javascript
// Add this to index.html for testing
async function testTauriAPI() {
    const tests = [
        { name: 'get_launcher_info', args: [] },
        { name: 'scan_for_games', args: [] },
        { name: 'locate_games', args: [] }
    ];
    
    for (const test of tests) {
        try {
            console.log(`Testing ${test.name}...`);
            const result = await window.__TAURI__.invoke(test.name, test.args);
            console.log(`✅ ${test.name}:`, result);
        } catch (error) {
            console.error(`❌ ${test.name} failed:`, error);
        }
    }
}
```

## Immediate Fixes Required

### Fix 1: Add Missing HTML Elements
Add these elements to `index.html`:

```html
<!-- Add after launcher-info section -->
<div id="game-list" class="game-list">
    <h3>Detected Games</h3>
    <div id="game-container"></div>
</div>

<div id="status-display" class="status-display">
    <div id="status-message">Ready</div>
    <div id="status-progress" class="hidden"></div>
</div>
```

### Fix 2: Add Error Handling
Update JavaScript functions to handle missing elements:

```javascript
function updateLauncherDisplay(launchers) {
    const launcherInfo = document.getElementById('launcher-info');
    const launcherGrid = document.getElementById('launcher-grid');
    
    // Add null checks
    if (!launcherInfo || !launcherGrid) {
        console.error('Required launcher display elements not found');
        return;
    }
    
    // Rest of the function...
}
```

### Fix 3: Test Tauri Development Mode
Try running in development mode to see if that fixes the API issue:

```bash
cd tauriapp
tauri dev
```

## Success Criteria

### Phase 1 Success (Backend)
- [ ] `window.__TAURI__.invoke('get_launcher_info')` returns data, not `undefined`
- [ ] `window.__TAURI__.invoke('scan_for_games')` returns data, not `undefined`
- [ ] No "Mock invoke" messages in console
- [ ] Backend commands execute successfully

### Phase 2 Success (Frontend)
- [ ] All required DOM elements exist
- [ ] No "Cannot set properties of null" errors
- [ ] UI updates display properly
- [ ] Error handling works gracefully

### Phase 3 Success (Integration)
- [ ] Launcher detection shows results
- [ ] Game scanning displays found games
- [ ] Map folder detection works
- [ ] App functions without mock fallbacks

## Next Actions

1. **Immediate** (Today):
   - Test Tauri API access in dev tools
   - Add missing HTML elements
   - Add error handling to JavaScript functions

2. **Short-term** (This week):
   - Implement comprehensive testing functions
   - Fix any remaining DOM issues
   - Test both development and production modes

3. **Medium-term** (Next week):
   - Add unit tests for backend commands
   - Add integration tests for frontend
   - Implement automated testing pipeline

## Risk Mitigation

**High Risk**: Tauri API communication failure
- **Mitigation**: Test in development mode, check Tauri configuration

**Medium Risk**: DOM structure mismatches
- **Mitigation**: Add missing elements, implement error handling

**Low Risk**: Performance and UI polish
- **Mitigation**: Focus on core functionality first

## Conclusion

The app has a solid foundation but critical runtime issues. The primary focus should be on:
1. Fixing Tauri API communication
2. Ensuring proper DOM structure
3. Implementing comprehensive testing

This debugging plan provides a systematic approach to identify and resolve these issues, ensuring the app functions as intended.
