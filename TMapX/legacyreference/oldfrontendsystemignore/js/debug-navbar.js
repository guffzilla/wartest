// Debug script to test navbar loading
console.log('🔍 Debug script loaded');

// Check if navbar container exists
const navbarContainer = document.getElementById('navbar-container');
console.log('🔍 Navbar container:', navbarContainer);

if (navbarContainer) {
  console.log('🔍 Navbar container HTML:', navbarContainer.innerHTML);
  console.log('🔍 Navbar container classes:', navbarContainer.className);
}

// Check if navbar element exists
const navbar = document.querySelector('.navbar-modern');
console.log('🔍 Navbar element:', navbar);

if (navbar) {
  console.log('🔍 Navbar classes:', navbar.className);
  console.log('🔍 Navbar style:', navbar.style.cssText);
}

// Check for any overlapping elements
const overlappingElements = document.querySelectorAll('[style*="position: fixed"], [style*="position: absolute"]');
console.log('🔍 Overlapping elements:', overlappingElements.length);

// Check for elements that might be covering the navbar
setTimeout(() => {
  const navbar = document.querySelector('.navbar-modern');
  if (navbar) {
    const navbarRect = navbar.getBoundingClientRect();
    console.log('🔍 Navbar position:', navbarRect);
    
    // Check for elements at the same position
    const elementsAtNavbarPosition = document.elementsFromPoint(
      navbarRect.left + navbarRect.width / 2,
      navbarRect.top + navbarRect.height / 2
    );
    
    console.log('🔍 Elements at navbar position:', elementsAtNavbarPosition);
    
    // Check if navbar is the top element
    if (elementsAtNavbarPosition.length > 0) {
      const topElement = elementsAtNavbarPosition[0];
      console.log('🔍 Top element at navbar position:', topElement);
      console.log('🔍 Is navbar the top element?', topElement === navbar);
      
      if (topElement !== navbar) {
        console.log('🔍 WARNING: Something is covering the navbar!');
        console.log('🔍 Covering element:', topElement);
        console.log('🔍 Covering element classes:', topElement.className);
        console.log('🔍 Covering element style:', topElement.style.cssText);
      }
    }
  }
}, 1000);

// Check moth system
const mothCanvas = document.getElementById('moth-flashlight-canvas');
console.log('🔍 Moth canvas:', mothCanvas);

if (mothCanvas) {
  console.log('🔍 Moth canvas style:', mothCanvas.style.cssText);
  console.log('🔍 Moth canvas z-index:', window.getComputedStyle(mothCanvas).zIndex);
}

// Test click events
document.addEventListener('click', (e) => {
  console.log('🎯 Click event:', e.target, e.target.tagName, e.target.className);
});

// Test navbar clickability
setTimeout(() => {
  const navbar = document.querySelector('.navbar-modern');
  if (navbar) {
    console.log('🔍 Testing navbar clickability...');
    
    // Add a temporary click handler to the navbar
    navbar.addEventListener('click', (e) => {
      console.log('🎯 Navbar clicked!', e.target);
    }, { once: true });
    
    // Try to programmatically click the navbar
    console.log('🔍 Attempting to programmatically click navbar...');
    navbar.click();
  }
}, 2000);

// Check if navbar script is loaded
console.log('🔍 Window navbar:', window.navbar);
console.log('🔍 Window ModernNavbar:', window.ModernNavbar);
