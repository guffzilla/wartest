/**
 * Canvas Book Engine - Realistic 3D Book Rendering
 * Creates immersive book experiences with realistic page flipping
 */

class CanvasBookEngine {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    // Book configuration
    this.width = options.width || 400;
    this.height = options.height || 500;
    this.pageCount = options.pageCount || 10;
    this.currentPage = 0;
    this.isFlipping = false;
    this.flipDirection = 1; // 1 for forward, -1 for backward
    
    // Campaign data
    this.campaignData = options.campaignData || [];
    this.userProgress = options.userProgress || [];
    
    // Animation properties
    this.flipProgress = 0;
    this.flipDuration = 800; // milliseconds
    this.lastFrameTime = 0;
    
    // 3D transformation matrices
    this.projectionMatrix = this.createProjectionMatrix();
    this.viewMatrix = this.createViewMatrix();
    
    // Book state
    this.pages = [];
    this.textures = {};
    this.lightSource = { x: 0, y: 0, z: 100 };
    
    // Audio system
    this.audio = new BookAudio();
    
    // Initialize
    this.setupCanvas();
    this.loadTextures();
    this.createPages();
    this.setupEventListeners();
    this.render();
  }
  
  setupCanvas() {
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    
    // Enable high DPI support
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    
    // Set canvas style
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
  }
  
  createProjectionMatrix() {
    // Simple perspective projection
    const fov = 45 * Math.PI / 180;
    const aspect = this.width / this.height;
    const near = 0.1;
    const far = 1000;
    
    const f = 1.0 / Math.tan(fov / 2);
    
    return [
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) / (near - far), -1,
      0, 0, (2 * far * near) / (near - far), 0
    ];
  }
  
  createViewMatrix() {
    // Camera positioned to view the book
    return [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, -5, 1
    ];
  }
  
  async loadTextures() {
    // Create paper texture
    this.textures.paper = this.createPaperTexture();
    
    // Create ink texture
    this.textures.ink = this.createInkTexture();
    
    // Create binding texture
    this.textures.binding = this.createBindingTexture();
    
    // Create aging texture
    this.textures.aging = this.createAgingTexture();
    
    // Create page curl texture
    this.textures.curl = this.createCurlTexture();
  }
  
  createPaperTexture() {
    const textureCanvas = document.createElement('canvas');
    const textureCtx = textureCanvas.getContext('2d');
    textureCanvas.width = 256;
    textureCanvas.height = 256;
    
    // Base paper color
    textureCtx.fillStyle = '#f8f8f0';
    textureCtx.fillRect(0, 0, 256, 256);
    
    // Add paper grain
    for (let i = 0; i < 2000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const alpha = Math.random() * 0.15;
      const size = Math.random() * 2 + 1;
      
      textureCtx.fillStyle = `rgba(200, 200, 180, ${alpha})`;
      textureCtx.fillRect(x, y, size, size);
    }
    
    // Add subtle lines
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const length = Math.random() * 100 + 50;
      const alpha = Math.random() * 0.1;
      
      textureCtx.strokeStyle = `rgba(180, 180, 160, ${alpha})`;
      textureCtx.lineWidth = 1;
      textureCtx.beginPath();
      textureCtx.moveTo(x, y);
      textureCtx.lineTo(x + length, y);
      textureCtx.stroke();
    }
    
    return textureCanvas;
  }
  
  createInkTexture() {
    const textureCanvas = document.createElement('canvas');
    const textureCtx = textureCanvas.getContext('2d');
    textureCanvas.width = 256;
    textureCanvas.height = 256;
    
    // Ink color variations
    const inkColors = ['#1a1a1a', '#2a2a2a', '#3a3a3a'];
    
    for (let i = 0; i < 500; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const color = inkColors[Math.floor(Math.random() * inkColors.length)];
      const alpha = Math.random() * 0.3;
      const size = Math.random() * 3 + 1;
      
      textureCtx.fillStyle = color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
      textureCtx.fillRect(x, y, size, size);
    }
    
    return textureCanvas;
  }
  
  createBindingTexture() {
    const textureCanvas = document.createElement('canvas');
    const textureCtx = textureCanvas.getContext('2d');
    textureCanvas.width = 64;
    textureCanvas.height = 256;
    
    // Leather binding effect
    const gradient = textureCtx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#8b4513');
    gradient.addColorStop(0.5, '#a0522d');
    gradient.addColorStop(1, '#8b4513');
    
    textureCtx.fillStyle = gradient;
    textureCtx.fillRect(0, 0, 64, 256);
    
    // Add leather texture
    for (let i = 0; i < 1000; i++) {
      const x = Math.random() * 64;
      const y = Math.random() * 256;
      const alpha = Math.random() * 0.2;
      const size = Math.random() * 2 + 1;
      
      textureCtx.fillStyle = `rgba(139, 69, 19, ${alpha})`;
      textureCtx.fillRect(x, y, size, size);
    }
    
    return textureCanvas;
  }
  
  createAgingTexture() {
    const textureCanvas = document.createElement('canvas');
    const textureCtx = textureCanvas.getContext('2d');
    textureCanvas.width = 256;
    textureCanvas.height = 256;
    
    // Aging spots and discoloration
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const radius = Math.random() * 20 + 10;
      const alpha = Math.random() * 0.3;
      
      const gradient = textureCtx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `rgba(200, 180, 120, ${alpha})`);
      gradient.addColorStop(1, 'rgba(200, 180, 120, 0)');
      
      textureCtx.fillStyle = gradient;
      textureCtx.beginPath();
      textureCtx.arc(x, y, radius, 0, Math.PI * 2);
      textureCtx.fill();
    }
    
    return textureCanvas;
  }
  
  createCurlTexture() {
    const textureCanvas = document.createElement('canvas');
    const textureCtx = textureCanvas.getContext('2d');
    textureCanvas.width = 256;
    textureCanvas.height = 256;
    
    // Curl shadow effect
    const gradient = textureCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
    gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    textureCtx.fillStyle = gradient;
    textureCtx.fillRect(0, 0, 256, 256);
    
    return textureCanvas;
  }
  
  createPages() {
    this.pages = [];
    
    // Recalculate page count based on campaign data
    if (this.campaignData && this.campaignData.length > 0) {
      this.pageCount = this.calculatePageCount(this.campaignData);
    }
    
    for (let i = 0; i < this.pageCount; i++) {
      this.pages.push({
        id: i,
        content: this.generatePageContent(i),
        texture: this.textures.paper,
        curlAngle: 0,
        curlRadius: 0,
        isFlipping: false,
        flipStartTime: 0,
        z: i * 0.1 // Depth for 3D effect
      });
    }
    
    // Update page info display
    this.updatePageInfo();
  }

  updatePageInfo() {
    const pageInfo = document.getElementById('page-info');
    if (pageInfo) {
      pageInfo.textContent = `Page ${this.currentPage + 1} of ${this.pageCount}`;
    }
  }

  calculatePageCount(campaignData) {
    if (!campaignData || campaignData.length === 0) return 1;
    
    let totalPages = 1; // Title page
    
    campaignData.forEach(gameGroup => {
      gameGroup.campaigns.forEach(campaign => {
        // One page per campaign
        totalPages += 1;
        // One page per mission
        totalPages += campaign.missions ? campaign.missions.length : 0;
      });
    });
    
    return totalPages;
  }
  
  generatePageContent(pageIndex) {
    // Generate content based on campaign data
    if (pageIndex === 0) {
      // Title page
      return {
        title: 'War Tales',
        subtitle: 'Campaign Chronicles',
        text: 'Welcome to the War Tales. Here you can track your progress through the campaigns of Warcraft I, II, and III.',
        missions: [],
        progress: 0,
        isTitlePage: true
      };
    }

    // Find campaign data for this page
    const campaignInfo = this.getCampaignForPage(pageIndex);
    if (!campaignInfo) {
      return {
        title: 'Page Not Found',
        text: 'This page is under construction.',
        missions: [],
        progress: 0
      };
    }

    const { gameGroup, campaign, mission } = campaignInfo;
    
    if (mission) {
      // Mission page
      const isCompleted = this.isMissionCompleted(mission._id);
      return {
        title: `Mission ${mission.missionNumber}`,
        subtitle: mission.missionName,
        text: mission.description || 'Complete this mission to earn rewards.',
        missions: [{
          name: mission.missionName,
          completed: isCompleted,
          reward: mission.experience || 5,
          missionId: mission._id
        }],
        progress: isCompleted ? 100 : 0,
        isMissionPage: true,
        game: gameGroup._id.game,
        expansion: gameGroup._id.expansion
      };
    } else if (campaign) {
      // Campaign overview page
      const progress = this.calculateCampaignProgress(campaign, gameGroup._id.game, gameGroup._id.expansion);
      return {
        title: campaign.campaignName,
        subtitle: `${gameGroup._id.game.toUpperCase()} - ${gameGroup._id.expansion}`,
        text: `Campaign for the ${campaign.race} race.`,
        missions: campaign.missions.map(m => ({
          name: m.missionName,
          completed: this.isMissionCompleted(m._id),
          reward: m.experience || 5,
          missionId: m._id
        })),
        progress: progress.percentage,
        isCampaignPage: true,
        game: gameGroup._id.game,
        expansion: gameGroup._id.expansion
      };
    }

    return {
      title: 'Page Not Found',
      text: 'This page is under construction.',
      missions: [],
      progress: 0
    };
  }

  getCampaignForPage(pageIndex) {
    if (pageIndex === 0) return null; // Title page
    
    let currentPage = 1; // Start after title page
    
    for (const gameGroup of this.campaignData) {
      for (const campaign of gameGroup.campaigns) {
        // Campaign overview page
        if (currentPage === pageIndex) {
          return { gameGroup, campaign, mission: null };
        }
        currentPage++;
        
        // Mission pages
        if (campaign.missions) {
          for (const mission of campaign.missions) {
            if (currentPage === pageIndex) {
              return { gameGroup, campaign, mission };
            }
            currentPage++;
          }
        }
      }
    }
    
    return null;
  }

  isMissionCompleted(missionId) {
    return this.userProgress.some(progress => 
      progress.missions && progress.missions.some(m => 
        m.missionId && m.missionId.toString() === missionId.toString()
      )
    );
  }

  calculateCampaignProgress(campaign, game, expansion) {
    const userCampaignProgress = this.userProgress.find(p => 
      p._id && p._id.game === game && 
      p._id.expansion === expansion && 
      p._id.campaignName === campaign.campaignName &&
      p._id.race === campaign.race
    );

    const completed = userCampaignProgress ? userCampaignProgress.completedMissions : 0;
    const total = campaign.totalMissions || campaign.missions.length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;

    return {
      completed,
      total,
      percentage: Math.round(percentage)
    };
  }
  
  setupEventListeners() {
    // Mouse events for page flipping
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    
    // Touch events for mobile
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
    
    // Keyboard events
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }
  
  handleMouseDown(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    this.startDrag(x, y);
  }
  
  handleMouseMove(event) {
    if (this.isDragging) {
      const rect = this.canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      this.updateDrag(x, y);
    }
  }
  
  handleMouseUp(event) {
    this.endDrag();
  }
  
  handleTouchStart(event) {
    event.preventDefault();
    const touch = event.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    this.startDrag(x, y);
  }
  
  handleTouchMove(event) {
    event.preventDefault();
    if (this.isDragging) {
      const touch = event.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      this.updateDrag(x, y);
    }
  }
  
  handleTouchEnd(event) {
    event.preventDefault();
    this.endDrag();
  }
  
  handleKeyDown(event) {
    switch (event.key) {
      case 'ArrowRight':
        this.flipPage(1);
        break;
      case 'ArrowLeft':
        this.flipPage(-1);
        break;
    }
  }
  
  startDrag(x, y) {
    this.isDragging = true;
    this.dragStartX = x;
    this.dragStartY = y;
    this.dragStartTime = performance.now();
  }
  
  updateDrag(x, y) {
    const deltaX = x - this.dragStartX;
    const deltaY = y - this.dragStartY;
    
    // Calculate drag direction and intensity
    this.dragDirection = deltaX > 0 ? 1 : -1;
    this.dragIntensity = Math.abs(deltaX) / this.width;
    
    // Update page curl based on drag
    if (this.dragIntensity > 0.1) {
      this.updatePageCurl(this.dragIntensity, this.dragDirection);
    }
  }
  
  endDrag() {
    if (this.isDragging && this.dragIntensity > 0.3) {
      // Complete the page flip
      this.flipPage(this.dragDirection);
    } else {
      // Snap back
      this.snapPageBack();
    }
    
    this.isDragging = false;
    this.dragIntensity = 0;
  }
  
  flipPage(direction) {
    if (this.isFlipping) return;
    
    const targetPage = this.currentPage + direction;
    if (targetPage < 0 || targetPage >= this.pageCount) return;
    
    this.isFlipping = true;
    this.flipDirection = direction;
    this.flipProgress = 0;
    this.flipStartTime = performance.now();
    
    // Play sound effect
    this.audio.playPageFlip();
    
    // Start animation
    this.animatePageFlip();
  }
  
  animatePageFlip() {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.flipStartTime;
    this.flipProgress = Math.min(deltaTime / this.flipDuration, 1);
    
    // Easing function for smooth animation
    const easedProgress = this.easeInOutCubic(this.flipProgress);
    
    // Update page curl
    this.updatePageCurl(easedProgress, this.flipDirection);
    
    if (this.flipProgress < 1) {
      requestAnimationFrame(() => this.animatePageFlip());
    } else {
      // Animation complete
      this.completePageFlip();
    }
  }
  
  easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  
  updatePageCurl(progress, direction) {
    const page = this.pages[this.currentPage];
    if (!page) return;
    
    page.curlAngle = progress * Math.PI * direction;
    
    // Calculate curl radius (for 3D effect)
    page.curlRadius = progress * 50;
    
    // Update page state
    page.isFlipping = progress > 0 && progress < 1;
    
    // Trigger re-render
    this.render();
  }
  
  completePageFlip() {
    this.currentPage += this.flipDirection;
    this.isFlipping = false;
    
    // Reset page curl
    const page = this.pages[this.currentPage - this.flipDirection];
    if (page) {
      page.curlAngle = 0;
      page.curlRadius = 0;
      page.isFlipping = false;
    }
    
    // Emit page change event
    this.onPageChange?.(this.currentPage);
    
    this.render();
  }
  
  snapPageBack() {
    // Animate page back to flat position
    const page = this.pages[this.currentPage];
    if (!page) return;
    
    const startAngle = page.curlAngle;
    const startRadius = page.curlRadius;
    const startTime = performance.now();
    const duration = 300;
    
    const animate = (currentTime) => {
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easedProgress = this.easeOutCubic(progress);
      
      page.curlAngle = startAngle * (1 - easedProgress);
      page.curlRadius = startRadius * (1 - easedProgress);
      
      this.render();
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }
  
  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }
  
  render() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    // Set up lighting
    this.updateLighting();
    
    // Render book binding
    this.renderBinding();
    
    // Render pages in order (back to front)
    for (let i = this.pages.length - 1; i >= 0; i--) {
      this.renderPage(this.pages[i]);
    }
    
    // Render page curl effects
    this.renderPageCurls();
    
    // Render UI elements
    this.renderUI();
  }
  
  updateLighting() {
    // Update light source position (follows mouse)
    if (this.isDragging) {
      this.lightSource.x = this.dragStartX - this.width / 2;
      this.lightSource.y = this.dragStartY - this.height / 2;
    }
  }
  
  renderBinding() {
    // Render book spine
    const spineWidth = 30;
    const spineX = this.width / 2 - spineWidth / 2;
    
    // Create gradient for spine
    const gradient = this.ctx.createLinearGradient(spineX, 0, spineX + spineWidth, 0);
    gradient.addColorStop(0, '#8b4513');
    gradient.addColorStop(0.5, '#a0522d');
    gradient.addColorStop(1, '#8b4513');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(spineX, 0, spineWidth, this.height);
    
    // Add spine texture
    this.ctx.drawImage(this.textures.binding, spineX, 0, spineWidth, this.height);
  }
  
  renderPage(page) {
    if (!page) return;
    
    const pageWidth = this.width - 60;
    const pageHeight = this.height - 40;
    const pageX = 30;
    const pageY = 20;
    
    // Apply 3D transformation
    this.ctx.save();
    
    // Apply page curl transformation
    if (page.curlAngle !== 0) {
      this.applyPageCurlTransform(page, pageX, pageY, pageWidth, pageHeight);
    }
    
    // Render page background
    this.renderPageBackground(page, pageX, pageY, pageWidth, pageHeight);
    
    // Render page content
    this.renderPageContent(page, pageX, pageY, pageWidth, pageHeight);
    
    // Apply lighting effects
    this.applyLightingEffects(page, pageX, pageY, pageWidth, pageHeight);
    
    this.ctx.restore();
  }
  
  applyPageCurlTransform(page, x, y, width, height) {
    // Calculate curl center
    const curlCenterX = x + width * (page.curlAngle > 0 ? 0 : 1);
    const curlCenterY = y + height / 2;
    
    // Apply rotation around curl center
    this.ctx.translate(curlCenterX, curlCenterY);
    this.ctx.rotate(page.curlAngle);
    this.ctx.translate(-curlCenterX, -curlCenterY);
    
    // Apply perspective distortion
    const perspective = 1 + Math.abs(page.curlAngle) * 0.3;
    this.ctx.scale(perspective, 1);
  }
  
  renderPageBackground(page, x, y, width, height) {
    // Draw page texture
    this.ctx.drawImage(page.texture, x, y, width, height);
    
    // Add aging effects
    this.ctx.globalAlpha = 0.3;
    this.ctx.drawImage(this.textures.aging, x, y, width, height);
    this.ctx.globalAlpha = 1.0;
  }
  
  renderPageContent(page, x, y, width, height) {
    const content = page.content;
    const padding = 20;
    const contentX = x + padding;
    const contentY = y + padding;
    const contentWidth = width - padding * 2;
    
    // Render title
    this.ctx.fillStyle = '#2a2a2a';
    this.ctx.font = 'bold 18px Cinzel, serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(content.title, x + width / 2, contentY + 25);
    
    // Render subtitle if present
    if (content.subtitle) {
      this.ctx.font = '14px Arial, sans-serif';
      this.ctx.fillStyle = '#666';
      this.ctx.fillText(content.subtitle, x + width / 2, contentY + 45);
    }
    
    // Render text
    this.ctx.font = '14px Arial, sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillStyle = '#333';
    
    const words = content.text.split(' ');
    let line = '';
    let lineY = contentY + (content.subtitle ? 70 : 50);
    const lineHeight = 18;
    
    for (let word of words) {
      const testLine = line + word + ' ';
      const metrics = this.ctx.measureText(testLine);
      
      if (metrics.width > contentWidth && line !== '') {
        this.ctx.fillText(line, contentX, lineY);
        line = word + ' ';
        lineY += lineHeight;
      } else {
        line = testLine;
      }
    }
    this.ctx.fillText(line, contentX, lineY);
    
    // Render missions if present
    if (content.missions && content.missions.length > 0) {
      lineY += 30;
      this.ctx.font = 'bold 16px Arial, sans-serif';
      this.ctx.fillStyle = '#2a2a2a';
      this.ctx.fillText('Missions:', contentX, lineY);
      
      lineY += 25;
      this.ctx.font = '12px Arial, sans-serif';
      
      content.missions.forEach((mission, index) => {
        const missionY = lineY + index * 20;
        const status = mission.completed ? '✓' : '○';
        const color = mission.completed ? '#28a745' : '#6c757d';
        
        this.ctx.fillStyle = color;
        this.ctx.fillText(`${status} ${mission.name}`, contentX, missionY);
        
        this.ctx.fillStyle = '#666';
        this.ctx.fillText(`Reward: ${mission.reward} XP`, contentX + 150, missionY);
      });
    }
    
    // Render progress bar if not title page
    if (!content.isTitlePage) {
      const progressY = y + height - 40;
      this.renderProgressBar(content.progress, x + padding, progressY, width - padding * 2, 8);
    }
  }
  
  renderProgressBar(progress, x, y, width, height) {
    // Background
    this.ctx.fillStyle = '#ddd';
    this.ctx.fillRect(x, y, width, height);
    
    // Progress fill
    const fillWidth = (progress / 100) * width;
    const gradient = this.ctx.createLinearGradient(x, y, x + fillWidth, y);
    gradient.addColorStop(0, '#d4af37');
    gradient.addColorStop(1, '#f4d03f');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(x, y, fillWidth, height);
    
    // Progress text
    this.ctx.fillStyle = '#333';
    this.ctx.font = '12px Arial, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`${Math.round(progress)}%`, x + width / 2, y + height + 15);
  }
  
  applyLightingEffects(page, x, y, width, height) {
    // Calculate lighting based on page position and curl
    const lightIntensity = this.calculateLightIntensity(page, x, y, width, height);
    
    // Apply shadow
    if (page.curlAngle !== 0) {
      this.renderPageShadow(page, x, y, width, height);
    }
    
    // Apply highlights
    this.renderPageHighlights(page, x, y, width, height, lightIntensity);
  }
  
  calculateLightIntensity(page, x, y, width, height) {
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    
    const distance = Math.sqrt(
      Math.pow(centerX - this.lightSource.x, 2) + 
      Math.pow(centerY - this.lightSource.y, 2)
    );
    
    return Math.max(0.3, 1 - distance / 200);
  }
  
  renderPageShadow(page, x, y, width, height) {
    // Create shadow for curled page
    const shadowOffset = Math.abs(page.curlAngle) * 20;
    const shadowAlpha = Math.abs(page.curlAngle) * 0.3;
    
    this.ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
    this.ctx.fillRect(x + shadowOffset, y, width, height);
  }
  
  renderPageHighlights(page, x, y, width, height, intensity) {
    // Add subtle highlights
    const highlightAlpha = intensity * 0.1;
    
    this.ctx.fillStyle = `rgba(255, 255, 255, ${highlightAlpha})`;
    this.ctx.fillRect(x, y, width, height);
  }
  
  renderPageCurls() {
    // Render curl effects for flipping pages
    this.pages.forEach(page => {
      if (page.isFlipping && page.curlAngle !== 0) {
        this.renderPageCurl(page);
      }
    });
  }
  
  renderPageCurl(page) {
    // Render the curled edge of the page
    const pageWidth = this.width - 60;
    const pageHeight = this.height - 40;
    const pageX = 30;
    const pageY = 20;
    
    const curlWidth = Math.abs(page.curlAngle) * 50;
    const curlX = page.curlAngle > 0 ? pageX : pageX + pageWidth - curlWidth;
    
    // Create curl gradient
    const gradient = this.ctx.createLinearGradient(curlX, 0, curlX + curlWidth, 0);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
    gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(curlX, pageY, curlWidth, pageHeight);
  }
  
  renderUI() {
    // Render page numbers
    this.ctx.fillStyle = '#666';
    this.ctx.font = '12px Arial, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`${this.currentPage + 1} / ${this.pageCount}`, this.width / 2, this.height - 10);
    
    // Render navigation hints
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.font = '10px Arial, sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('← → Arrow keys or drag to flip', 10, this.height - 10);
  }
  
  // Public methods
  goToPage(pageIndex) {
    if (pageIndex >= 0 && pageIndex < this.pageCount) {
      this.currentPage = pageIndex;
      this.render();
      this.onPageChange?.(pageIndex);
    }
  }
  
  setPageContent(pageIndex, content) {
    if (this.pages[pageIndex]) {
      this.pages[pageIndex].content = content;
      this.render();
    }
  }
  
  destroy() {
    // Clean up event listeners
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    this.canvas.removeEventListener('touchmove', this.handleTouchMove);
    this.canvas.removeEventListener('touchend', this.handleTouchEnd);
    document.removeEventListener('keydown', this.handleKeyDown);
  }
}

/**
 * Audio system for book effects
 */
class BookAudio {
  constructor() {
    this.sounds = {};
    this.loadSounds();
  }
  
  async loadSounds() {
    // Create audio contexts for different sounds
    this.sounds.pageFlip = this.createPageFlipSound();
    this.sounds.bookOpen = this.createBookOpenSound();
    this.sounds.paperRustle = this.createPaperRustleSound();
  }
  
  createPageFlipSound() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    return { context: audioContext, oscillator, gainNode };
  }
  
  createBookOpenSound() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    return { context: audioContext, oscillator, gainNode };
  }
  
  createPaperRustleSound() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const bufferSize = audioContext.sampleRate * 0.1; // 0.1 seconds
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = buffer.getChannelData(0);
    
    // Generate noise
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    
    const source = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();
    
    source.buffer = buffer;
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    return { context: audioContext, source, gainNode };
  }
  
  playPageFlip() {
    try {
      const sound = this.sounds.pageFlip;
      if (sound && sound.context.state === 'suspended') {
        sound.context.resume();
      }
      
      sound.oscillator.start(sound.context.currentTime);
      sound.oscillator.stop(sound.context.currentTime + 0.1);
    } catch (error) {
      console.warn('Audio playback failed:', error);
    }
  }
  
  playBookOpen() {
    try {
      const sound = this.sounds.bookOpen;
      if (sound && sound.context.state === 'suspended') {
        sound.context.resume();
      }
      
      sound.oscillator.start(sound.context.currentTime);
      sound.oscillator.stop(sound.context.currentTime + 0.2);
    } catch (error) {
      console.warn('Audio playback failed:', error);
    }
  }
  
  playPaperRustle() {
    try {
      const sound = this.sounds.paperRustle;
      if (sound && sound.context.state === 'suspended') {
        sound.context.resume();
      }
      
      sound.source.start(sound.context.currentTime);
    } catch (error) {
      console.warn('Audio playback failed:', error);
    }
  }
}

// Export for use in other modules
window.CanvasBookEngine = CanvasBookEngine;
window.BookAudio = BookAudio;
