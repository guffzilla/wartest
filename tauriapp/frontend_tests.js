// ============================================================================
// FRONTEND TESTING FRAMEWORK
// ============================================================================

console.log('🧪 Loading Frontend Testing Framework...');

// Test Results Storage
const testResults = {
    passed: 0,
    failed: 0,
    total: 0,
    details: []
};

// Test Utility Functions
function assert(condition, message) {
    testResults.total++;
    if (condition) {
        testResults.passed++;
        console.log(`✅ PASS: ${message}`);
        testResults.details.push({ status: 'PASS', message });
    } else {
        testResults.failed++;
        console.error(`❌ FAIL: ${message}`);
        testResults.details.push({ status: 'FAIL', message });
    }
}

function assertEqual(actual, expected, message) {
    assert(actual === expected, `${message} - Expected: ${expected}, Got: ${actual}`);
}

function assertExists(value, message) {
    assert(value !== null && value !== undefined, `${message} - Value is null or undefined`);
}

function assertType(value, type, message) {
    assert(typeof value === type, `${message} - Expected type: ${type}, Got: ${typeof value}`);
}

// ============================================================================
// TAURI API TESTS
// ============================================================================

function testTauriApiDetection() {
    console.log('\n🔍 Testing Tauri API Detection...');
    
    // Test 1: Check if window.__TAURI__ exists
    assertExists(window.__TAURI__, 'window.__TAURI__ should exist');
    
    if (window.__TAURI__) {
        // Test 2: Check Tauri v2 API structure
        if (window.__TAURI__.core) {
            assertExists(window.__TAURI__.core.invoke, 'window.__TAURI__.core.invoke should exist');
            assertType(window.__TAURI__.core.invoke, 'function', 'window.__TAURI__.core.invoke should be a function');
            console.log('✅ Tauri v2 API structure detected');
        }
        // Test 3: Check Tauri v1 API structure
        else if (window.__TAURI__.invoke) {
            assertExists(window.__TAURI__.invoke, 'window.__TAURI__.invoke should exist');
            assertType(window.__TAURI__.invoke, 'function', 'window.__TAURI__.invoke should be a function');
            console.log('✅ Tauri v1 API structure detected');
        }
        // Test 4: Check for other API properties
        else {
            console.log('⚠️ Tauri API exists but structure is unknown');
            console.log('Available properties:', Object.keys(window.__TAURI__));
        }
    } else {
        console.log('❌ Tauri API not available - this is the core issue');
    }
}

function testTauriCommandInvocation() {
    console.log('\n🔍 Testing Tauri Command Invocation...');
    
    if (!window.__TAURI__) {
        console.log('⚠️ Skipping command tests - Tauri API not available');
        return;
    }
    
    // Get the invoke function
    let invoke;
    if (window.__TAURI__.core && window.__TAURI__.core.invoke) {
        invoke = window.__TAURI__.core.invoke;
    } else if (window.__TAURI__.invoke) {
        invoke = window.__TAURI__.invoke;
    } else {
        console.log('❌ No invoke function found');
        return;
    }
    
    // Test 1: Test scan_for_games command
    console.log('Testing scan_for_games command...');
    invoke('scan_for_games')
        .then(result => {
            assertExists(result, 'scan_for_games should return a result');
            assertType(result, 'object', 'scan_for_games should return an object');
            console.log('✅ scan_for_games command works');
        })
        .catch(error => {
            console.error('❌ scan_for_games command failed:', error);
        });
    
    // Test 2: Test get_launcher_info command
    console.log('Testing get_launcher_info command...');
    invoke('get_launcher_info')
        .then(result => {
            assertExists(result, 'get_launcher_info should return a result');
            assertType(result, 'object', 'get_launcher_info should return an object');
            console.log('✅ get_launcher_info command works');
        })
        .catch(error => {
            console.error('❌ get_launcher_info command failed:', error);
        });
}

// ============================================================================
// DOM MANIPULATION TESTS
// ============================================================================

function testDomManipulation() {
    console.log('\n🔍 Testing DOM Manipulation...');
    
    // Test 1: Check document readiness
    assertExists(document, 'document should exist');
    assertExists(document.body, 'document.body should exist');
    console.log('Document ready state:', document.readyState);
    
    // Test 2: Check critical elements exist
    const criticalElements = [
        'scan-progress',
        'progress-fill', 
        'scan-status',
        'game-list',
        'launcher-list'
    ];
    
    criticalElements.forEach(elementId => {
        const element = document.getElementById(elementId);
        if (element) {
            console.log(`✅ Element '${elementId}' exists`);
        } else {
            console.log(`❌ Element '${elementId}' missing`);
        }
    });
    
    // Test 3: Test element content updates
    const testElement = document.getElementById('scan-status');
    if (testElement) {
        const originalContent = testElement.innerHTML;
        testElement.innerHTML = 'Test Content';
        assertEqual(testElement.innerHTML, 'Test Content', 'Element content should be updatable');
        testElement.innerHTML = originalContent; // Restore
        console.log('✅ Element content updates work');
    }
}

function testErrorHandling() {
    console.log('\n🔍 Testing Error Handling...');
    
    // Test 1: Test null element access
    const nonExistentElement = document.getElementById('non-existent-element');
    assert(nonExistentElement === null, 'Non-existent element should return null');
    
    // Test 2: Test safe element access
    try {
        const safeElement = document.getElementById('scan-status') || document.createElement('div');
        safeElement.innerHTML = 'Safe Update';
        console.log('✅ Safe element access works');
    } catch (error) {
        console.error('❌ Safe element access failed:', error);
    }
    
    // Test 3: Test try-catch error handling
    try {
        throw new Error('Test error');
    } catch (error) {
        assertExists(error.message, 'Error should have a message');
        assertEqual(error.message, 'Test error', 'Error message should match');
        console.log('✅ Error handling works');
    }
}

// ============================================================================
// MOCK FUNCTION TESTS
// ============================================================================

function testMockFunctions() {
    console.log('\n🔍 Testing Mock Functions...');
    
    // Test 1: Check if mock functions are defined
    if (typeof window.mockInvoke === 'function') {
        console.log('✅ Mock invoke function exists');
        
        // Test mock function behavior
        try {
            const result = window.mockInvoke('test_command');
            console.log('Mock invoke result:', result);
        } catch (error) {
            console.log('Mock invoke error:', error);
        }
    } else {
        console.log('❌ Mock invoke function not defined');
    }
    
    // Test 2: Check if fallback functions are defined
    const fallbackFunctions = [
        'scanForGames',
        'detectLaunchers',
        'updateGameDisplay',
        'updateLauncherDisplay'
    ];
    
    fallbackFunctions.forEach(funcName => {
        if (typeof window[funcName] === 'function') {
            console.log(`✅ Fallback function '${funcName}' exists`);
        } else {
            console.log(`❌ Fallback function '${funcName}' missing`);
        }
    });
}

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

function testIntegration() {
    console.log('\n🔍 Testing Integration...');
    
    // Test 1: Test complete initialization flow
    if (typeof window.initializeApp === 'function') {
        console.log('✅ initializeApp function exists');
        
        // Test initialization
        try {
            window.initializeApp();
            console.log('✅ App initialization started');
        } catch (error) {
            console.error('❌ App initialization failed:', error);
        }
    } else {
        console.log('❌ initializeApp function missing');
    }
    
    // Test 2: Test Tauri API integration
    if (window.__TAURI__) {
        console.log('✅ Tauri API available for integration');
        
        // Test command integration
        let invoke;
        if (window.__TAURI__.core && window.__TAURI__.core.invoke) {
            invoke = window.__TAURI__.core.invoke;
        } else if (window.__TAURI__.invoke) {
            invoke = window.__TAURI__.invoke;
        }
        
        if (invoke) {
            console.log('✅ Invoke function available for integration');
        } else {
            console.log('❌ Invoke function not available');
        }
    } else {
        console.log('❌ Tauri API not available for integration');
    }
}

// ============================================================================
// DEBUGGING TOOLS
// ============================================================================

function inspectTauriApi() {
    console.log('\n🔍 === TAURI API INSPECTION ===');
    console.log('window.__TAURI__:', window.__TAURI__);
    
    if (window.__TAURI__) {
        console.log('window.__TAURI__.core:', window.__TAURI__.core);
        console.log('window.__TAURI__.invoke:', window.__TAURI__.invoke);
        console.log('Available properties:', Object.keys(window.__TAURI__));
        
        if (window.__TAURI__.core) {
            console.log('Core properties:', Object.keys(window.__TAURI__.core));
        }
    } else {
        console.log('❌ Tauri API not available');
    }
}

function inspectDom() {
    console.log('\n🔍 === DOM INSPECTION ===');
    console.log('Document ready state:', document.readyState);
    console.log('Body exists:', !!document.body);
    
    const criticalElements = {
        'scan-progress': !!document.getElementById('scan-progress'),
        'progress-fill': !!document.getElementById('progress-fill'),
        'scan-status': !!document.getElementById('scan-status'),
        'game-list': !!document.getElementById('game-list'),
        'launcher-list': !!document.getElementById('launcher-list')
    };
    
    console.log('Critical elements:', criticalElements);
}

function inspectGlobalFunctions() {
    console.log('\n🔍 === GLOBAL FUNCTION INSPECTION ===');
    
    const functions = [
        'initializeApp',
        'scanForGames',
        'detectLaunchers',
        'updateGameDisplay',
        'updateLauncherDisplay',
        'mockInvoke'
    ];
    
    functions.forEach(funcName => {
        const exists = typeof window[funcName] === 'function';
        console.log(`${funcName}: ${exists ? '✅' : '❌'}`);
    });
}

// ============================================================================
// TEST RUNNER
// ============================================================================

function runAllTests() {
    console.log('🚀 Starting Frontend Test Suite...');
    console.log('=====================================');
    
    // Reset test results
    testResults.passed = 0;
    testResults.failed = 0;
    testResults.total = 0;
    testResults.details = [];
    
    // Run all tests
    testTauriApiDetection();
    testTauriCommandInvocation();
    testDomManipulation();
    testErrorHandling();
    testMockFunctions();
    testIntegration();
    
    // Run debugging tools
    inspectTauriApi();
    inspectDom();
    inspectGlobalFunctions();
    
    // Print results
    console.log('\n=====================================');
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('=====================================');
    console.log(`Total Tests: ${testResults.total}`);
    console.log(`Passed: ${testResults.passed}`);
    console.log(`Failed: ${testResults.failed}`);
    console.log(`Success Rate: ${testResults.total > 0 ? Math.round((testResults.passed / testResults.total) * 100) : 0}%`);
    
    if (testResults.failed > 0) {
        console.log('\n❌ FAILED TESTS:');
        testResults.details
            .filter(detail => detail.status === 'FAIL')
            .forEach(detail => console.log(`  - ${detail.message}`));
    }
    
    console.log('\n✅ Frontend Test Suite Complete!');
    
    return testResults;
}

// Auto-run tests when loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runAllTests);
} else {
    runAllTests();
}

// Export for manual testing
window.runFrontendTests = runAllTests;
window.inspectTauriApi = inspectTauriApi;
window.inspectDom = inspectDom;
window.inspectGlobalFunctions = inspectGlobalFunctions;
