// Test file to verify coordinator loading
console.log('🔍 Test coordinator file loaded');

// Check if coordinator is available
if (window.coordinator) {
  console.log('✅ Coordinator found:', window.coordinator);
} else {
  console.log('❌ Coordinator not found');
}

// Check if main.js loaded
if (window._initCoordinator) {
  console.log('✅ Init coordinator instance found');
} else {
  console.log('❌ Init coordinator instance not found');
}
