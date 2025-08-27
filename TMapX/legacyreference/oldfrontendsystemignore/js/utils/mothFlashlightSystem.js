/**
 * Unified Moth and Flashlight System
 * 
 * This system provides ambient moth animations and flashlight effects
 * that works identically across all pages.
 */

class MothFlashlightSystem {
  constructor(options = {}) {
    this.options = {
      canvasId: 'moth-flashlight-canvas',
      mothCount: 3, // Exactly 3 detailed moths
      mothSpeed: 1.2,
      mothSize: { min: 18, max: 25 }, // Larger moths for better visibility
      flashlightRadius: 100, // Torch area
      flashlightColor: 'rgba(255, 140, 0, 0.4)', // Amber torch color
      enableDebug: false,
      zIndex: 1,
      ...options
    };

    this.moths = [];
    this.flashlightActive = true; // Torch ON by default
    this.mothsActive = true;
    this.mouseX = 0;
    this.mouseY = 0;
    this.rafId = null;
    this.lastTime = 0;
    this.frameCount = 0;
    this.fps = 0;
    this.canvas = null;
    this.ctx = null;
    this.dpr = window.devicePixelRatio || 1;
    this.isInitialized = false;
    
    // Torch color cycling
    this.torchColors = [
      'rgba(255, 140, 0, 0.4)',   // Amber
      'rgba(255, 69, 0, 0.4)',    // Red-orange
      'rgba(255, 215, 0, 0.4)',   // Gold
      'rgba(255, 165, 0, 0.4)'    // Orange
    ];
    this.currentColorIndex = 0;
    
    // Particle system for embers
    this.embers = [];

    this.init();
  }

  init() {
    try {
      // Wait for DOM to be ready before initializing
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          this.initializeSystem();
        });
      } else {
        this.initializeSystem();
      }
    } catch (error) {
      console.error('Failed to initialize MothFlashlightSystem:', error);
    }
    // HOT RELOAD TEST 2: This line was added to test real-time updates
  }

  initializeSystem() {
    try {
      this.createCanvas();
      this.createMoths();
      this.setupEventListeners();
      this.startRenderLoop();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize MothFlashlightSystem system:', error);
    }
  }

  createCanvas() {
    // Remove existing canvas if it exists
    const existingCanvas = document.getElementById(this.options.canvasId);
    if (existingCanvas) {
      existingCanvas.remove();
    }

    // Create new canvas
    this.canvas = document.createElement('canvas');
    this.canvas.id = this.options.canvasId;
    this.canvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 1;
    `;

    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    // Set canvas size
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    if (!this.canvas) return;const width = window.innerWidth || document.documentElement.clientWidth || 800;
    const height = window.innerHeight || document.documentElement.clientHeight || 600;
    
    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    
    // Reset context scale after resize
    this.ctx.scale(this.dpr, this.dpr);
  }

  createMoths() {
    this.moths = [];
    const width = window.innerWidth || document.documentElement.clientWidth || 800;
    const height = window.innerHeight || document.documentElement.clientHeight || 600;
    
    // Use the same detailed moth designs for all pages
    const mothSpecs = [
      {
        // White furry moth with fake eyes
        color: 'hsl(50, 30%, 90%)', // Bright white
        furDensity: 0.9,
        eyeSize: 0.4,
        antennaLength: 1.3,
        personality: 'curious',
        attractionToLight: 0.8,
        wingPattern: 'feathery',
        bodyTexture: 'furry',
        size: this.options.mothSize.min + Math.random() * (this.options.mothSize.max - this.options.mothSize.min),
        headSize: 0.4, // Head is 40% of body
        wingSpan: 1.8, // Wings are 1.8x body width
        antennaThickness: 0.8
      },
      {
        // Brown bark camouflage moth - more visible
        color: 'hsl(25, 60%, 45%)', // Much brighter brown for visibility
        barkTexture: 0.8,
        antennaLength: 1.1,
        personality: 'shy',
        attractionToLight: 0.3,
        wingPattern: 'bark-like',
        bodyTexture: 'rough',
        size: this.options.mothSize.min + Math.random() * (this.options.mothSize.max - this.options.mothSize.min),
        headSize: 0.35, // Head is 35% of body
        wingSpan: 1.6, // Wings are 1.6x body width
        antennaThickness: 0.7
      },
      {
        // Green leaf camouflage moth - more visible
        color: 'hsl(85, 70%, 45%)', // Much brighter green for visibility
        leafVeins: 0.9,
        antennaLength: 1.0,
        personality: 'adventurous',
        attractionToLight: 0.6,
        wingPattern: 'leaf-like',
        bodyTexture: 'smooth',
        size: this.options.mothSize.min + Math.random() * (this.options.mothSize.max - this.options.mothSize.min),
        headSize: 0.38, // Head is 38% of body
        wingSpan: 1.7, // Wings are 1.7x body width
        antennaThickness: 0.75
      }
    ];
    
    // Create exactly 3 moths
    for (let i = 0; i < this.options.mothCount; i++) {
      const specIndex = i % mothSpecs.length; // Cycle through the 3 moth types
      const spec = mothSpecs[specIndex];
      
      const mothData = {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * this.options.mothSpeed,
        vy: (Math.random() - 0.5) * this.options.mothSpeed,
        size: spec.size,
        flap: Math.random() * Math.PI * 2,
        flapSpeed: 0.5 + Math.random() * 0.3,
        alpha: 0.8 + Math.random() * 0.2, // More visible
        // Enhanced personality traits
        personality: spec.personality,
        mothType: specIndex,
        antennaAngle: Math.random() * Math.PI * 2,
        antennaWiggle: Math.random() * Math.PI * 2,
        antennaWiggleSpeed: 0.4 + Math.random() * 0.4,
        dancePhase: Math.random() * Math.PI * 2,
        danceSpeed: 0.2 + Math.random() * 0.3,
        attractionToLight: spec.attractionToLight,
        fearLevel: 0,
        targetX: null,
        targetY: null,
        state: 'wandering',
        // Unique moth characteristics
        wingPattern: spec.wingPattern,
        bodyTexture: spec.bodyTexture,
        eyeGlow: Math.random(),
        // Specific properties
        furDensity: spec.furDensity,
        eyeSize: spec.eyeSize,
        antennaLength: spec.antennaLength,
        barkTexture: spec.barkTexture,
        leafVeins: spec.leafVeins,
        color: spec.color,
        // New anatomy properties
        headSize: spec.headSize,
        wingSpan: spec.wingSpan,
        antennaThickness: spec.antennaThickness
      };
      
      this.moths.push(mothData);
    }
  }

  updateMoths(deltaTime) {
    this.moths.forEach(moth => {
      // Update wing flapping
      moth.flap += moth.flapSpeed * deltaTime * 0.05;
      
      // Update antenna wiggling
      moth.antennaWiggle += moth.antennaWiggleSpeed * deltaTime * 0.05;
      
      // Calculate distance to flashlight
      const distanceToLight = Math.sqrt(
        Math.pow(moth.x - this.mouseX, 2) + Math.pow(moth.y - this.mouseY, 2)
      );
      
      // Update moth state based on flashlight proximity
      if (this.flashlightActive && distanceToLight < this.options.flashlightRadius * 0.8) {
        if (moth.state === 'wandering') {
          moth.state = 'dancing';
          moth.dancePhase = Math.random() * Math.PI * 2;
        }
      } else if (moth.state === 'dancing') {
        moth.state = 'wandering';
      }
      
      // Handle different states
      if (moth.state === 'fleeing') {
        this.updateFleeingMoth(moth, deltaTime);
      } else if (moth.state === 'dancing') {
        this.updateDancingMoth(moth, deltaTime, distanceToLight);
      } else {
        this.updateWanderingMoth(moth, deltaTime);
      }
      
      // Reduce fear over time
      moth.fearLevel = Math.max(0, moth.fearLevel - deltaTime * 0.001);
      if (moth.fearLevel < 0.1) {
        moth.state = 'wandering';
      }
      
      // Keep moths on screen
      const width = window.innerWidth || document.documentElement.clientWidth || 800;
      const height = window.innerHeight || document.documentElement.clientHeight || 600;
      moth.x = Math.max(0, Math.min(width, moth.x));
      moth.y = Math.max(0, Math.min(height, moth.y));
    });
  }

  drawMoths() {
    if (!this.mothsActive || !this.ctx) return;this.moths.forEach(moth => {
      this.ctx.save();
      this.ctx.translate(moth.x, moth.y);
      this.ctx.rotate(Math.sin(moth.flap) * 0.1); // Subtle rotation

      // Draw moth with proper anatomy
      this.drawMothBody(moth);
      this.drawMothWings(moth);
      this.drawMothAntennas(moth);
      this.drawMothHead(moth);
      
      // Add texture based on moth type
      if (moth.mothType === 0) {
        this.drawFurTexture(moth);
      } else if (moth.mothType === 1) {
        this.drawBarkTexture(moth);
      } else {
        this.drawLeafVeins(moth);
      }

      // Draw eyes for white moth
      if (moth.mothType === 0) {
        this.drawFakeEyes(moth);
      }

      this.ctx.restore();
    });
  }

  drawMothBody(moth) {
    // Main body (thorax and abdomen)
    this.ctx.fillStyle = moth.color;
    this.ctx.globalAlpha = moth.alpha;
    
    // Thorax (upper body)
    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, moth.size * 0.6, moth.size * 0.3, 0, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Abdomen (lower body)
    this.ctx.beginPath();
    this.ctx.ellipse(0, moth.size * 0.4, moth.size * 0.5, moth.size * 0.25, 0, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Body segments
    this.ctx.strokeStyle = moth.color;
    this.ctx.lineWidth = 1;
    this.ctx.globalAlpha = moth.alpha * 0.7;
    
    for (let i = 0; i < 3; i++) {
      const y = moth.size * 0.2 + i * moth.size * 0.15;
      this.ctx.beginPath();
      this.ctx.ellipse(0, y, moth.size * 0.4, moth.size * 0.2, 0, 0, Math.PI * 2);
      this.ctx.stroke();
    }
  }

  drawMothHead(moth) {
    // Head
    this.ctx.fillStyle = moth.color;
    this.ctx.globalAlpha = moth.alpha;
    
    const headSize = moth.size * moth.headSize;
    this.ctx.beginPath();
    this.ctx.arc(0, -moth.size * 0.6, headSize, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Head outline
    this.ctx.strokeStyle = moth.color;
    this.ctx.lineWidth = 1;
    this.ctx.globalAlpha = moth.alpha * 0.8;
    this.ctx.stroke();
    
    // Simple eyes (basic dots)
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.globalAlpha = moth.alpha;
    
    // Left eye
    this.ctx.beginPath();
    this.ctx.arc(-headSize * 0.3, -moth.size * 0.6 - headSize * 0.1, headSize * 0.15, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Right eye
    this.ctx.beginPath();
    this.ctx.arc(headSize * 0.3, -moth.size * 0.6 - headSize * 0.1, headSize * 0.15, 0, Math.PI * 2);
    this.ctx.fill();
  }

  drawMothWings(moth) {
    const wingSpan = moth.size * moth.wingSpan;
    const wingHeight = moth.size * 0.8;
    
    // Left wing
    this.ctx.save();
    this.ctx.translate(-moth.size * 0.4, -moth.size * 0.2);
    this.ctx.rotate(Math.sin(moth.flap) * 0.3);
    
    this.ctx.fillStyle = moth.color;
    this.ctx.globalAlpha = moth.alpha * 0.6;
    
    // Wing shape with more detail
    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);
    this.ctx.quadraticCurveTo(-wingSpan * 0.3, -wingHeight * 0.3, -wingSpan * 0.6, -wingHeight * 0.6);
    this.ctx.quadraticCurveTo(-wingSpan * 0.8, -wingHeight * 0.8, -wingSpan, -wingHeight);
    this.ctx.quadraticCurveTo(-wingSpan * 0.8, -wingHeight * 0.4, -wingSpan * 0.6, -wingHeight * 0.2);
    this.ctx.quadraticCurveTo(-wingSpan * 0.3, -wingHeight * 0.1, 0, 0);
    this.ctx.fill();
    
    // Wing veins
    this.ctx.strokeStyle = moth.color;
    this.ctx.lineWidth = 0.5;
    this.ctx.globalAlpha = moth.alpha * 0.8;
    
    for (let i = 1; i <= 3; i++) {
      const x = -wingSpan * (i / 4);
      const y = -wingHeight * (i / 4);
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.lineTo(x, y);
      this.ctx.stroke();
    }
    
    this.ctx.restore();
    
    // Right wing
    this.ctx.save();
    this.ctx.translate(moth.size * 0.4, -moth.size * 0.2);
    this.ctx.rotate(-Math.sin(moth.flap) * 0.3);
    
    this.ctx.fillStyle = moth.color;
    this.ctx.globalAlpha = moth.alpha * 0.6;
    
    // Wing shape (mirrored)
    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);
    this.ctx.quadraticCurveTo(wingSpan * 0.3, -wingHeight * 0.3, wingSpan * 0.6, -wingHeight * 0.6);
    this.ctx.quadraticCurveTo(wingSpan * 0.8, -wingHeight * 0.8, wingSpan, -wingHeight);
    this.ctx.quadraticCurveTo(wingSpan * 0.8, -wingHeight * 0.4, wingSpan * 0.6, -wingHeight * 0.2);
    this.ctx.quadraticCurveTo(wingSpan * 0.3, -wingHeight * 0.1, 0, 0);
    this.ctx.fill();
    
    // Wing veins (mirrored)
    this.ctx.strokeStyle = moth.color;
    this.ctx.lineWidth = 0.5;
    this.ctx.globalAlpha = moth.alpha * 0.8;
    
    for (let i = 1; i <= 3; i++) {
      const x = wingSpan * (i / 4);
      const y = -wingHeight * (i / 4);
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.lineTo(x, y);
      this.ctx.stroke();
    }
    
    this.ctx.restore();
  }

  drawMothAntennas(moth) {
    const antennaLength = moth.size * 1.2 * moth.antennaLength; // Longer antennas
    const antennaThickness = moth.size * 0.15 * moth.antennaThickness; // Thicker antennas
    
    // Much less antenna movement - only when moths are excited
    const isExcited = moth.state === 'dancing' || moth.state === 'fleeing' || moth.attractionToLight > 0.7;
    const movementMultiplier = isExcited ? 0.4 : 0.05; // Very subtle movement normally
    
    this.ctx.strokeStyle = moth.color;
    this.ctx.lineWidth = antennaThickness;
    this.ctx.globalAlpha = moth.alpha * 0.9;
    
    // Left antenna with minimal wiggle
    const leftAntennaAngle = moth.antennaAngle + Math.sin(moth.antennaWiggle) * movementMultiplier;
    const leftAntennaX = -moth.size * 0.3;
    const leftAntennaY = -moth.size * 0.6 - moth.size * moth.headSize;
    
    this.ctx.beginPath();
    this.ctx.moveTo(leftAntennaX, leftAntennaY);
    this.ctx.lineTo(
      leftAntennaX + Math.cos(leftAntennaAngle) * antennaLength,
      leftAntennaY + Math.sin(leftAntennaAngle) * antennaLength
    );
    this.ctx.stroke();
    
    // Right antenna with minimal wiggle
    const rightAntennaAngle = moth.antennaAngle + Math.sin(moth.antennaWiggle + Math.PI) * movementMultiplier;
    const rightAntennaX = moth.size * 0.3;
    const rightAntennaY = -moth.size * 0.6 - moth.size * moth.headSize;
    
    this.ctx.beginPath();
    this.ctx.moveTo(rightAntennaX, rightAntennaY);
    this.ctx.lineTo(
      rightAntennaX + Math.cos(rightAntennaAngle) * antennaLength,
      rightAntennaY + Math.sin(rightAntennaAngle) * antennaLength
    );
    this.ctx.stroke();
    
    // Draw furry texture along the antennas
    this.drawAntennaFur(moth, leftAntennaX, leftAntennaY, leftAntennaAngle, antennaLength, antennaThickness);
    this.drawAntennaFur(moth, rightAntennaX, rightAntennaY, rightAntennaAngle, antennaLength, antennaThickness);
    
    // Antenna tips - larger and more pronounced
    this.ctx.fillStyle = moth.color;
    this.ctx.globalAlpha = moth.alpha;
    
    // Left tip
    const leftTipX = leftAntennaX + Math.cos(leftAntennaAngle) * antennaLength;
    const leftTipY = leftAntennaY + Math.sin(leftAntennaAngle) * antennaLength;
    this.ctx.beginPath();
    this.ctx.arc(leftTipX, leftTipY, antennaThickness * 1.2, 0, Math.PI * 2); // Larger tip
    this.ctx.fill();
    
    // Right tip
    const rightTipX = rightAntennaX + Math.cos(rightAntennaAngle) * antennaLength;
    const rightTipY = rightAntennaY + Math.sin(rightAntennaAngle) * antennaLength;
    this.ctx.beginPath();
    this.ctx.arc(rightTipX, rightTipY, antennaThickness * 1.2, 0, Math.PI * 2); // Larger tip
    this.ctx.fill();
  }
  
  drawAntennaFur(moth, startX, startY, angle, length, thickness) {
    // Draw furry texture along the antenna
    this.ctx.strokeStyle = moth.color;
    this.ctx.lineWidth = 1;
    this.ctx.globalAlpha = moth.alpha * 0.7;
    
    // Draw fur strands along the antenna
    const furSegments = 8;
    for (let i = 1; i <= furSegments; i++) {
      const segmentProgress = i / furSegments;
      const x = startX + Math.cos(angle) * length * segmentProgress;
      const y = startY + Math.sin(angle) * length * segmentProgress;
      
      // Fur strands perpendicular to antenna direction
      const furLength = thickness * 0.8;
      const furAngle = angle + Math.PI / 2; // Perpendicular to antenna
      
      // Left fur strand
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      this.ctx.lineTo(
        x + Math.cos(furAngle) * furLength,
        y + Math.sin(furAngle) * furLength
      );
      this.ctx.stroke();
      
      // Right fur strand
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      this.ctx.lineTo(
        x + Math.cos(furAngle + Math.PI) * furLength,
        y + Math.sin(furAngle + Math.PI) * furLength
      );
      this.ctx.stroke();
    }
  }

  drawFlashlight() {
    if (!this.flashlightActive || !this.ctx) return;const gradient = this.ctx.createRadialGradient(
      this.mouseX, this.mouseY, 0,
      this.mouseX, this.mouseY, this.options.flashlightRadius
    );
    
    // Torch light 30% more pronounced
    const flicker = 0.05 + Math.sin(Date.now() * 0.01) * 0.03; // Reduced flicker
    const currentColor = this.torchColors[this.currentColorIndex];
    
    gradient.addColorStop(0, currentColor.replace('0.4', '0.20')); // 30% brighter center
    gradient.addColorStop(0.3, currentColor.replace('0.4', '0.10')); // 30% brighter
    gradient.addColorStop(0.6, currentColor.replace('0.4', '0.05')); // 30% brighter
    gradient.addColorStop(1, 'rgba(255, 140, 0, 0)'); // Completely transparent edge

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    
    // No torch flame effect - only embers on click
    // this.drawTorchFlame(); // Removed
    
    // No glow ring around the torch
    // this.ctx.strokeStyle = currentColor.replace('0.4', '0.6');
    // this.ctx.lineWidth = 4;
    // this.ctx.beginPath();
    // this.ctx.arc(this.mouseX, this.mouseY, this.options.flashlightRadius * 0.7, 0, Math.PI * 2);
    // this.ctx.stroke();
  }

  render(currentTime) {
    if (!this.ctx) return;const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    this.frameCount++;

    // Calculate FPS every second
    if (this.frameCount % 60 === 0) {
      this.fps = Math.round(1000 / deltaTime);
      this.updateDebugInfo();
    }

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Update and draw
    this.updateMoths(deltaTime);
    this.drawFlashlight();
    this.drawMoths();
    this.updateEmbers(); // Update embers
    this.drawEmbers(); // Draw embers

    this.rafId = requestAnimationFrame((time) => this.render(time));
  }

  startRenderLoop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    this.render(0);
  }

  setupEventListeners() {
    // Mouse tracking
    document.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });

    // Touch tracking for mobile
    document.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        this.mouseX = e.touches[0].clientX;
        this.mouseY = e.touches[0].clientY;
      }
    });

    // Click detection for moth interaction and ember creation
    document.addEventListener('click', (e) => {
      this.handleMothClick(e.clientX, e.clientY);
      this.createEmbers(e.clientX, e.clientY); // Create embers on click
    });

    // Touch click for mobile
    document.addEventListener('touchend', (e) => {
      if (e.changedTouches.length > 0) {
        const touch = e.changedTouches[0];
        this.handleMothClick(touch.clientX, touch.clientY);
        this.createEmbers(touch.clientX, touch.clientY); // Create embers on touch
      }
    });

    // Keyboard controls for torch
    document.addEventListener('keydown', (e) => {
      // F key cycles torch colors
      if (e.key.toLowerCase() === 'f' && !e.shiftKey) {
        e.preventDefault();
        this.cycleTorchColor();
        console.log('🦋 Torch color cycled to:', this.torchColors[this.currentColorIndex]);
      }
      
      // Shift+F toggles torch on/off
      if (e.key.toLowerCase() === 'f' && e.shiftKey) {
        e.preventDefault();
        this.toggleFlashlight();
        console.log('🦋 Torch toggled:', this.flashlightActive ? 'ON' : 'OFF');
      }
    });
  }

  handleMothClick(clickX, clickY) {
    this.moths.forEach(moth => {
      const distance = Math.sqrt(
        Math.pow(moth.x - clickX, 2) + Math.pow(moth.y - clickY, 2)
      );
      
      // If click is within moth's clickable area
      if (distance < moth.size * 2) {
        moth.state = 'fleeing';
        moth.fearLevel = 1.0;
        
        // Calculate flee direction (away from click)
        const dx = moth.x - clickX;
        const dy = moth.y - clickY;
        const distanceToClick = Math.sqrt(dx * dx + dy * dy);
        
        if (distanceToClick > 0) {
          // Set velocity away from click point
          moth.vx = (dx / distanceToClick) * this.options.mothSpeed * 2;
          moth.vy = (dy / distanceToClick) * this.options.mothSpeed * 2;
        } else {
          // Random direction if click is exactly on moth
          const angle = Math.random() * Math.PI * 2;
          moth.vx = Math.cos(angle) * this.options.mothSpeed * 2;
          moth.vy = Math.sin(angle) * this.options.mothSpeed * 2;
        }
        
        // Enhanced antenna wiggle when scared
        moth.antennaWiggleSpeed = 0.6 + Math.random() * 0.4;
      }
    });
  }

  updateDebugInfo() {
    if (!this.options.enableDebug) return;const mothCountEl = document.getElementById('moth-count');
    const flashlightStatusEl = document.getElementById('flashlight-status');
    const mothFpsEl = document.getElementById('moth-fps');

    if (mothCountEl) mothCountEl.textContent = this.moths.length;
    if (flashlightStatusEl) flashlightStatusEl.textContent = this.flashlightActive ? 'ON' : 'OFF';
    if (mothFpsEl) mothFpsEl.textContent = this.fps;
  }

  updateFleeingMoth(moth, deltaTime) {
    // Fleeing behavior - move away from current position
    moth.vx *= 1.02; // Slight acceleration
    moth.vy *= 1.02;
    
    // Add some randomness to fleeing direction
    moth.vx += (Math.random() - 0.5) * 0.5;
    moth.vy += (Math.random() - 0.5) * 0.5;
  }

  updateDancingMoth(moth, deltaTime, distanceToLight) {
    // Dance pattern based on personality
    moth.dancePhase += moth.danceSpeed * deltaTime * 0.05;
    const danceRadius = 30 + moth.personality * 40;
    
    if (moth.personality < 0.3) {
      // Circular dance
      moth.targetX = this.mouseX + Math.cos(moth.dancePhase) * danceRadius;
      moth.targetY = this.mouseY + Math.sin(moth.dancePhase) * danceRadius;
    } else if (moth.personality < 0.6) {
      // Figure-8 dance
      moth.targetX = this.mouseX + Math.sin(moth.dancePhase) * danceRadius;
      moth.targetY = this.mouseY + Math.sin(moth.dancePhase * 2) * danceRadius * 0.5;
    } else {
      // Spiral dance
      const spiralRadius = danceRadius * (0.5 + moth.dancePhase / (Math.PI * 4));
      moth.targetX = this.mouseX + Math.cos(moth.dancePhase) * spiralRadius;
      moth.targetY = this.mouseY + Math.sin(moth.dancePhase) * spiralRadius;
    }
    
    // Move towards dance target
    const dx = moth.targetX - moth.x;
    const dy = moth.targetY - moth.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 2) {
      moth.vx = dx / distance * this.options.mothSpeed * 0.8;
      moth.vy = dy / distance * this.options.mothSpeed * 0.8;
    }
    
    // Enhanced antenna wiggle when dancing
    moth.antennaWiggleSpeed = 0.4 + Math.random() * 0.3;
  }

  updateWanderingMoth(moth, deltaTime) {
    // Normal wandering behavior
    moth.antennaWiggleSpeed = 0.2 + Math.random() * 0.1;
    
    // Check attraction to ember particles
    let attractedToEmbers = false;
    this.embers.forEach(ember => {
      const distanceToEmber = Math.sqrt(
        Math.pow(moth.x - ember.x, 2) + Math.pow(moth.y - ember.y, 2)
      );
      
      if (distanceToEmber < ember.attractionRadius) {
        attractedToEmbers = true;
        // Move towards ember with attraction strength
        const dx = ember.x - moth.x;
        const dy = ember.y - moth.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
          const attraction = ember.attractionStrength * 0.3;
          moth.vx += (dx / distance) * attraction;
          moth.vy += (dy / distance) * attraction;
          
          // Enhanced antenna wiggle when attracted to embers
          moth.antennaWiggleSpeed = 0.5 + Math.random() * 0.3;
        }
      }
    });
    
    // Slight attraction to torch light if within range (but less than ember attraction)
    if (this.flashlightActive && !attractedToEmbers) {
      const distanceToLight = Math.sqrt(
        Math.pow(moth.x - this.mouseX, 2) + Math.pow(moth.y - this.mouseY, 2)
      );
      
      if (distanceToLight < this.options.flashlightRadius * 1.2) {
        const attraction = moth.attractionToLight * 0.05; // Much weaker than ember attraction
        const dx = this.mouseX - moth.x;
        const dy = this.mouseY - moth.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
          moth.vx += (dx / distance) * attraction;
          moth.vy += (dy / distance) * attraction;
        }
      }
    }
    
    // Update position
    moth.x += moth.vx * deltaTime * 0.05;
    moth.y += moth.vy * deltaTime * 0.05;
    
    // Flap speed correlates with movement speed
    const currentSpeed = Math.sqrt(moth.vx * moth.vx + moth.vy * moth.vy);
    const baseFlapSpeed = 0.3;
    moth.flapSpeed = baseFlapSpeed + (currentSpeed / this.options.mothSpeed) * 0.4;
    moth.flap += moth.flapSpeed * deltaTime * 0.05;
    
    // Bounce off edges
    if (moth.x < 0 || moth.x > window.innerWidth) {
      moth.vx *= -1;
      moth.x = Math.max(0, Math.min(window.innerWidth, moth.x));
    }
    if (moth.y < 0 || moth.y > window.innerHeight) {
      moth.vy *= -1;
      moth.y = Math.max(0, Math.min(window.innerHeight, moth.y));
    }
    
    // Limit maximum speed
    const maxSpeed = this.options.mothSpeed * 1.5;
    const currentSpeedSquared = moth.vx * moth.vx + moth.vy * moth.vy;
    if (currentSpeedSquared > maxSpeed * maxSpeed) {
      const scale = maxSpeed / Math.sqrt(currentSpeedSquared);
      moth.vx *= scale;
      moth.vy *= scale;
    }
  }

  // Public API methods
  toggleFlashlight() {
    this.flashlightActive = !this.flashlightActive;
    return this.flashlightActive;}

  toggleMoths() {
    this.mothsActive = !this.mothsActive;
    return this.mothsActive;}

  setFlashlightActive(active) {
    this.flashlightActive = active;
  }

  setMothsActive(active) {
    this.mothsActive = active;
  }

  addMoths(count = 1) {
    for (let i = 0; i < count; i++) {
      this.moths.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * this.options.mothSpeed,
        vy: (Math.random() - 0.5) * this.options.mothSpeed,
        size: this.options.mothSize.min + Math.random() * (this.options.mothSize.max - this.options.mothSize.min),
        flap: Math.random() * Math.PI * 2,
        flapSpeed: 0.3 + Math.random() * 0.4,
        color: `hsl(${Math.random() * 60 + 30}, 70%, 70%)`,
        alpha: 0.3 + Math.random() * 0.4,
        // New properties for enhanced behavior
        antennaAngle: Math.random() * Math.PI * 2,
        antennaWiggle: Math.random() * Math.PI * 2,
        antennaWiggleSpeed: 0.2 + Math.random() * 0.3,
        personality: Math.random(),
        dancePhase: Math.random() * Math.PI * 2,
        danceSpeed: 0.1 + Math.random() * 0.2,
        attractionToLight: 0.5 + Math.random() * 0.5,
        fearLevel: 0,
        targetX: null,
        targetY: null,
        state: 'wandering'
      });
    }
  }

  removeMoths(count = 1) {
    const removeCount = Math.min(count, this.moths.length);
    this.moths.splice(0, removeCount);
  }

  cleanup() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }

    this.isInitialized = false;
  }

  drawFurTexture(moth) {
    // Draw fur texture on white moth
    this.ctx.strokeStyle = moth.color;
    this.ctx.lineWidth = 1;
    this.ctx.globalAlpha = moth.alpha * 0.8;
    
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x = Math.cos(angle) * moth.size * 0.3;
      const y = Math.sin(angle) * moth.size * 0.15;
      const furLength = moth.size * 0.2 * moth.furDensity;
      
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      this.ctx.lineTo(x + Math.cos(angle) * furLength, y + Math.sin(angle) * furLength);
      this.ctx.stroke();
    }
  }

  drawBarkTexture(moth) {
    // Draw bark texture on bark moth
    this.ctx.strokeStyle = `hsl(${Math.random() * 20 + 15}, 50%, 20%)`;
    this.ctx.lineWidth = 2;
    this.ctx.globalAlpha = moth.alpha * 0.6;
    
    for (let i = 0; i < 5; i++) {
      const y = (i - 2) * moth.size * 0.1;
      const barkWidth = moth.size * 0.4 * moth.barkTexture;
      
      this.ctx.beginPath();
      this.ctx.moveTo(-barkWidth, y);
      this.ctx.lineTo(barkWidth, y);
      this.ctx.stroke();
    }
  }

  drawLeafVeins(moth) {
    // Draw leaf veins on leaf moth
    this.ctx.strokeStyle = `hsl(${Math.random() * 20 + 70}, 60%, 25%)`;
    this.ctx.lineWidth = 1.5;
    this.ctx.globalAlpha = moth.alpha * 0.7;
    
    // Main vein
    this.ctx.beginPath();
    this.ctx.moveTo(0, -moth.size * 0.3);
    this.ctx.lineTo(0, moth.size * 0.3);
    this.ctx.stroke();
    
    // Side veins
    for (let i = 0; i < 4; i++) {
      const y = (i - 1.5) * moth.size * 0.15;
      const veinLength = moth.size * 0.25 * moth.leafVeins;
      
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(-veinLength, y - moth.size * 0.05);
      this.ctx.stroke();
      
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(veinLength, y - moth.size * 0.05);
      this.ctx.stroke();
    }
  }

  drawFakeEyes(moth) {
    // Draw fake eyes on white moth
    this.ctx.globalAlpha = moth.alpha * 0.9;
    
    // Left eye
    this.ctx.fillStyle = 'black';
    this.ctx.beginPath();
    this.ctx.arc(-moth.size * 0.3, -moth.size * 0.2, moth.size * 0.08 * moth.eyeSize, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Right eye
    this.ctx.beginPath();
    this.ctx.arc(moth.size * 0.3, -moth.size * 0.2, moth.size * 0.08 * moth.eyeSize, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Eye glow effect
    this.ctx.fillStyle = `rgba(255, 255, 255, ${moth.eyeGlow * 0.3})`;
    this.ctx.beginPath();
    this.ctx.arc(-moth.size * 0.3, -moth.size * 0.2, moth.size * 0.04 * moth.eyeSize, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.beginPath();
    this.ctx.arc(moth.size * 0.3, -moth.size * 0.2, moth.size * 0.04 * moth.eyeSize, 0, Math.PI * 2);
    this.ctx.fill();
  }

  createEmbers(x, y) {
    // Create attractive ember particles that moths will be drawn to
    for (let i = 0; i < 8; i++) { // More embers for better attraction
      this.embers.push({
        x: x + (Math.random() - 0.5) * 20, // Slightly larger spread
        y: y + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 2, // Slightly faster for more dynamic movement
        vy: (Math.random() - 0.5) * 2 - 0.8, // More upward drift like real embers
        size: 1.5 + Math.random() * 3, // Slightly larger for better visibility
        life: 1.2 + Math.random() * 0.6, // Longer life for sustained attraction
        decay: 0.02 + Math.random() * 0.03, // Slower decay
        flicker: Math.random() * Math.PI * 2, // Flicker phase
        flickerSpeed: 0.15 + Math.random() * 0.25, // Flicker speed
        attractionRadius: 80, // Radius within which moths are attracted
        attractionStrength: 0.8 + Math.random() * 0.4, // How strongly moths are attracted
        color: this.torchColors[this.currentColorIndex]
      });
    }
  }

  updateEmbers() {
    // Update ember particles
    for (let i = this.embers.length - 1; i >= 0; i--) {
      const ember = this.embers[i];
      
      // Update position
      ember.x += ember.vx;
      ember.y += ember.vy;
      
      // Add gravity
      ember.vy += 0.05; // Lighter gravity
      
      // Update flicker
      ember.flicker += ember.flickerSpeed;
      
      // Update life
      ember.life -= ember.decay;
      
      // Remove dead embers
      if (ember.life <= 0) {
        this.embers.splice(i, 1);
      }
    }
  }

  drawEmbers() {
    // Draw realistic ember particles
    this.embers.forEach(ember => {
      this.ctx.save();
      
      // Flickering effect for realistic ember glow
      const flickerIntensity = 0.4 + Math.sin(ember.flicker) * 0.3;
      this.ctx.globalAlpha = ember.life * flickerIntensity;
      
      // Ember glow effect - more realistic with orange/red colors
      const gradient = this.ctx.createRadialGradient(
        ember.x, ember.y, 0,
        ember.x, ember.y, ember.size * 2
      );
      
      // More realistic ember colors - orange/red center fading to transparent
      const emberColor = ember.color.replace('0.4', '0.8');
      gradient.addColorStop(0, 'rgba(255, 100, 0, 0.9)'); // Bright orange center
      gradient.addColorStop(0.3, emberColor.replace('0.8', '0.6')); // Ember color
      gradient.addColorStop(0.7, 'rgba(255, 69, 0, 0.3)'); // Red-orange
      gradient.addColorStop(1, 'rgba(255, 140, 0, 0)'); // Transparent edge
      
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(ember.x, ember.y, ember.size * 2, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Small bright center like a real ember
      this.ctx.fillStyle = 'rgba(255, 255, 200, 0.8)'; // Yellow-white center
      this.ctx.globalAlpha = ember.life * 0.9;
      this.ctx.beginPath();
      this.ctx.arc(ember.x, ember.y, ember.size * 0.4, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.restore();
    });
  }

  cycleTorchColor() {
    // Cycle through torch colors
    this.currentColorIndex = (this.currentColorIndex + 1) % this.torchColors.length;
    this.options.flashlightColor = this.torchColors[this.currentColorIndex];
  }
}

// Export for ES6 modules
export default MothFlashlightSystem;

// Also make available globally for non-module usage
if (typeof window !== 'undefined') {
  window.MothFlashlightSystem = MothFlashlightSystem;
}
