/**
 * PenInkOverlay
 * Feathered pen overlay that draws ink along the caret path for a textarea or contenteditable.
 * - No assets, uses offscreen brush canvas
 * - Stacks a transparent canvas above the input
 */

class PenInkOverlay {
  /**
   * @param {HTMLTextAreaElement|HTMLElement} inputEl - textarea or contenteditable element
   */
  constructor(inputEl) {
    this.inputEl = inputEl;
    this.wrapper = null;
    this.canvasInk = null; // persistent engraved strokes
    this.ctxInk = null;
    this.canvasFX = null;  // transient particles/chips
    this.ctxFX = null;
    this.baseBrush = null;
    this.nibAngle = Math.PI / 4;
    this.crisp = false;
    this.lastCaretPos = null;
    this.lastTime = performance.now();
    this._raf = 0;
    this._resizeObserver = null;
    this.particles = [];
    this.maxParticles = 400; // cap for performance
    this.engraveDabs = [];
    this._keyChipUntil = 0; // ms timestamp until which chips are allowed

    this._initStack();
    this._initBrush();
    this._bind();
    this._tick();
  }

  /** Wrap input in a positioned container and stack a canvas above it */
  _initStack() {
    const el = this.inputEl;
    // If already wrapped, reuse
    if (el.parentElement && el.parentElement.classList.contains('ink-stack')) {
      this.wrapper = el.parentElement;
    } else {
      const wrapper = document.createElement('div');
      wrapper.className = 'ink-stack';
      wrapper.style.position = 'relative';
      wrapper.style.width = '100%';
      // Insert wrapper before el and move el inside
      el.parentElement.insertBefore(wrapper, el);
      wrapper.appendChild(el);
      this.wrapper = wrapper;
    }

    // Create canvas overlay
    // Ink/stroke layer (bottom)
    const canvasInk = document.createElement('canvas');
    canvasInk.style.position = 'absolute';
    canvasInk.style.inset = '0';
    canvasInk.style.pointerEvents = 'none';
    // Keep overlay below global navbar (z-index 1000) and other UI
    canvasInk.style.zIndex = '3';
    this.wrapper.appendChild(canvasInk);
    this.canvasInk = canvasInk;
    this.ctxInk = canvasInk.getContext('2d');

    // Particles layer (top)
    const canvasFX = document.createElement('canvas');
    canvasFX.style.position = 'absolute';
    canvasFX.style.inset = '0';
    canvasFX.style.pointerEvents = 'none';
    canvasFX.style.zIndex = '4';
    this.wrapper.appendChild(canvasFX);
    this.canvasFX = canvasFX;
    this.ctxFX = canvasFX.getContext('2d');

    // Create a feather/pen icon that follows the caret
    const chisel = document.createElement('i');
    chisel.className = 'fas fa-hammer ink-chisel-icon';
    chisel.setAttribute('aria-hidden', 'true');
    chisel.style.position = 'absolute';
    chisel.style.pointerEvents = 'none';
    chisel.style.zIndex = '5';
    chisel.style.color = getComputedStyle(document.documentElement).getPropertyValue('--primary-gold') || '#D4AF37';
    chisel.style.fontSize = '14px';
    chisel.style.opacity = '0';
    chisel.style.transformOrigin = '50% 80%';
    chisel.style.animation = 'chiselStrike 1.1s ease-in-out infinite';
    // Keep it visible only when input has focus
    const handleFocus = () => { chisel.style.opacity = '1'; };
    const handleBlur = () => { chisel.style.opacity = '0'; };
    this.inputEl.addEventListener('focus', handleFocus);
    this.inputEl.addEventListener('blur', handleBlur);
    this._cleanupIconHandlers = () => {
      this.inputEl.removeEventListener('focus', handleFocus);
      this.inputEl.removeEventListener('blur', handleBlur);
    };
    this.wrapper.appendChild(chisel);
    this.penIcon = chisel;

    this._resizeCanvas();
    this._resizeObserver = new ResizeObserver(() => this._resizeCanvas());
    this._resizeObserver.observe(this.wrapper);
  }

  _dpi() { return window.devicePixelRatio || 1;}

  _resizeCanvas() {
    if (!this.wrapper) return;const r = this.wrapper.getBoundingClientRect();
    const d = this._dpi();
    const canvases = [this.canvasInk, this.canvasFX];
    const contexts = [this.ctxInk, this.ctxFX];
    canvases.forEach((c, i) => {
      if (!c) return;c.width = Math.max(2, Math.round(r.width * d));
      c.height = Math.max(2, Math.round(r.height * d));
      c.style.width = r.width + 'px';
      c.style.height = r.height + 'px';
      const ctx = contexts[i];
      ctx && ctx.setTransform(d, 0, 0, d, 0, 0);
    });
  }

  _inkRGB() {
    const val = getComputedStyle(document.documentElement).getPropertyValue('--ink');
    return (val && val.trim()) || '24,22,18';}

  _chipRGB() {
    // Optional CSS var: --stone-chip: r,g,b
    const val = getComputedStyle(document.documentElement).getPropertyValue('--stone-chip');
    return (val && val.trim()) || '235,232,224';}

  _makeBrush(size = 96, feather = 0.8) {
    const off = document.createElement('canvas');
    off.width = off.height = size;
    const octx = off.getContext('2d');
    const g = octx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    const ink = this._inkRGB();
    g.addColorStop(0, `rgba(${ink},1)`);
    g.addColorStop(feather, `rgba(${ink},0.25)`);
    g.addColorStop(1, `rgba(${ink},0)`);
    octx.fillStyle = g;
    octx.fillRect(0, 0, size, size);
    return off;}

  _initBrush() {
    this.baseBrush = this._makeBrush(96, 0.8);
  }

  _bind() {
    const el = this.inputEl;
    this._resetCaretSoon = this._resetCaretSoon.bind(this);
    this._onBlur = this._onBlur.bind(this);
    const allowChips = () => { this._keyChipUntil = performance.now() + 140; };

    const events = ['input','keyup','click','pointerup','compositionend','focus','scroll'];
    events.forEach(ev => el.addEventListener(ev, this._resetCaretSoon));
    el.addEventListener('blur', this._onBlur);
    // Only show chips around keystrokes
    el.addEventListener('keydown', allowChips);
    el.addEventListener('input', allowChips);
  }

  _unBind() {
    const el = this.inputEl;
    const events = ['input','keyup','click','pointerup','compositionend','focus','scroll'];
    events.forEach(ev => el.removeEventListener(ev, this._resetCaretSoon));
    el.removeEventListener('blur', this._onBlur);
    el.removeEventListener('keydown', () => {});
    el.removeEventListener('input', () => {});
  }

  toggleNib() { this.nibAngle = (Math.abs(this.nibAngle - Math.PI/4) < 1e-3) ? (Math.PI/8) : (Math.PI/4); }
  toggleCrisp() { this.crisp = !this.crisp; this.baseBrush = this._makeBrush(96, this.crisp ? 0.65 : 0.8); }
  clear() {
    if (this.ctxInk && this.canvasInk) {
      this.ctxInk.clearRect(0, 0, this.canvasInk.width, this.canvasInk.height);
    }
    if (this.ctxFX && this.canvasFX) {
      this.ctxFX.clearRect(0, 0, this.canvasFX.width, this.canvasFX.height);
    }
  }

  _getCaretClientRect() {
    // Only compute when this input has focus/selection to avoid heavy per-frame work
    const el = this.inputEl;
    const tag = el.tagName;
    if (el instanceof HTMLTextAreaElement || tag === 'TEXTAREA' || tag === 'INPUT') {
      if (document.activeElement !== el) return null;return this._plainTextCaretRect(el);}
    // contenteditable: ensure selection is within element
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;const anchorNode = sel.anchorNode;
    if (!el.contains(anchorNode)) return null;return this._contentEditableCaretRect();}

  _contentEditableCaretRect() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;const range = sel.getRangeAt(0).cloneRange();
    if (range.collapsed) {
      const rects = range.getClientRects();
      if (rects.length) return rects[0];const span = document.createElement('span');
      span.appendChild(document.createTextNode('\u200b'));
      range.insertNode(span);
      const rect = span.getBoundingClientRect();
      span.parentNode && span.parentNode.removeChild(span);
      return rect;} else {
      const rects = range.getClientRects();
      if (rects.length) return rects[rects.length - 1];}
    return null;}

  // Mirror DIV technique for input/textarea caret pixel position
  _plainTextCaretRect(el) {
    if (!(el instanceof HTMLTextAreaElement) && !(el instanceof HTMLInputElement)) return null;const style = window.getComputedStyle(el);
    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.visibility = 'hidden';
    div.style.whiteSpace = (el instanceof HTMLTextAreaElement) ? 'pre-wrap' : 'pre';
    div.style.wordWrap = 'break-word';
    div.style.overflow = 'auto';
    div.style.width = el.clientWidth + 'px';
    const props = ['fontFamily','fontSize','fontWeight','fontStyle','letterSpacing','textTransform','textIndent','textAlign','lineHeight','paddingTop','paddingRight','paddingBottom','paddingLeft','borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth'];
    props.forEach(p => { div.style[p] = style[p]; });

    const elRect = el.getBoundingClientRect();
    div.style.left = elRect.left + window.scrollX + 'px';
    div.style.top = elRect.top + window.scrollY + 'px';
    document.body.appendChild(div);

    const selStart = el.selectionStart || 0;
    const text = (el.value || '').substring(0, selStart);
    const span = document.createElement('span');
    span.textContent = '\u200b';
    div.textContent = text;
    div.appendChild(span);

    const spanRect = span.getBoundingClientRect();
    const lineH = parseFloat(style.lineHeight) || parseFloat(style.fontSize) || 16;

    // Return viewport-relative coordinates. Downstream code converts to canvas/local space.
    document.body.removeChild(div);
    return { left: spanRect.left, top: spanRect.top, height: lineH };}

  _clientToCanvas(x, y) {
    const wrapRect = this.wrapper.getBoundingClientRect();
    return { x: x - wrapRect.left, y: y - wrapRect.top };}

  _interpolate(a, b, step = 2) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    const n = Math.max(1, Math.floor(dist / step));
    const pts = [];
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      pts.push({ x: a.x + dx * t, y: a.y + dy * t, t });
    }
    return pts;}

  _drawEngrave(x, y, major, minor, angle, pressure, shouldRecord = true) {
    // Simulate chiseled groove: light highlight + dark shadow offsets
    const ctx = this.ctxInk;
    if (!ctx) return;const highlightRGB = getComputedStyle(document.documentElement).getPropertyValue('--stone-highlight')?.trim() || '245,244,238';
    const shadowRGB = getComputedStyle(document.documentElement).getPropertyValue('--stone-shadow')?.trim() || '50,48,46';
    const highlightAlpha = 0.28 + 0.22 * pressure;
    const shadowAlpha = 0.32 + 0.28 * pressure;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(major / (this.baseBrush.width / 2), minor / (this.baseBrush.height / 2));
    // Shadow (bottom-right)
    ctx.globalAlpha = shadowAlpha;
    ctx.filter = 'blur(0.3px)';
    ctx.drawImage(this.baseBrush, 1.2 - this.baseBrush.width / 2, 1.2 - this.baseBrush.height / 2);
    // Tint shadow
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = `rgba(${shadowRGB},1)`;
    ctx.fillRect(-this.baseBrush.width / 2, -this.baseBrush.height / 2, this.baseBrush.width, this.baseBrush.height);
    // Highlight (top-left)
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = highlightAlpha;
    ctx.filter = 'none';
    ctx.drawImage(this.baseBrush, -1.0 - this.baseBrush.width / 2, -1.0 - this.baseBrush.height / 2);
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = `rgba(${highlightRGB},1)`;
    ctx.fillRect(-this.baseBrush.width / 2, -this.baseBrush.height / 2, this.baseBrush.width, this.baseBrush.height);
    ctx.restore();
    // Record for debug persistence (pruned)
    if (shouldRecord) {
      this.engraveDabs.push({ x, y, major, minor, angle, pressure, ts: performance.now() });
      if (this.engraveDabs.length > 400) {
        this.engraveDabs.splice(0, this.engraveDabs.length - 400);
      }
    }
  }

  _drawSegment(a, b, dt) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    const speed = dist / Math.max(1, dt);
    const pressure = 1 / (1 + 8 * speed);
    const baseMajor = 7 + 11 * pressure;
    const baseMinor = 0.55 * baseMajor;
    const pts = this._interpolate(a, b, 2);
    for (const p of pts) {
      // Position chisel farther from caret
      if (this.penIcon) {
        this.penIcon.style.left = Math.max(0, p.x - 18) + 'px';
        this.penIcon.style.top = Math.max(0, p.y - 26) + 'px';
        this.penIcon.style.opacity = '1';
      }
      // Smaller, fewer chips slightly under letters
      if (performance.now() <= this._keyChipUntil) {
        const chipCount = Math.min(3, Math.max(1, Math.round((1 - pressure) * 2)));
        this._emitChips(p.x, p.y + 3, dx, dy, chipCount);
      }
      this._updateParticles(dt);
      this._renderParticles();
    }
  }

  _emitChips(x, y, dx, dy, count) {
    // Spawn tiny chips drifting downward under letters
    const chipRGB = this._chipRGB();
    for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
      const vx = (Math.random() - 0.5) * 0.4; // slight horizontal jitter
      const vy = 0.3 + Math.random() * 0.8;   // downward
      this.particles.push({
        x: x + (Math.random() - 0.5) * 1.0,
        y: y + (Math.random() * 1.5),
        vx, vy,
        r: 0.8 + Math.random() * 0.8,
        life: 260 + Math.random() * 280,
        age: 0,
        rgb: chipRGB,
        spin: (Math.random() - 0.5) * 0.3
      });
    }
  }

  _updateParticles(dt) {
    const ctxFX = this.ctxFX;
    if (!ctxFX) return;const gravity = 0.26;
    const drag = 0.982;
    const arr = this.particles;
    let write = 0;
    for (let read = 0; read < arr.length; read++) {
      const p = arr[read];
      p.age += dt;
      if (p.age >= p.life) continue; // drop (skip copying)
      // physics
      p.vy += gravity * (dt / 16.67);
      p.vx *= drag; p.vy *= drag;
      p.x += p.vx * (dt / 16.67) * 2.0;
      p.y += p.vy * (dt / 16.67) * 2.0;
      p.r *= 0.997; // tiny shrink
      arr[write++] = p;
    }
    arr.length = write;
  }

  _renderParticles() {
    const ctx = this.ctxFX;
    if (!ctx) return;ctx.clearRect(0, 0, this.canvasFX.width, this.canvasFX.height);
    // No engrave re-draws; particles only to avoid artifacts
    for (const p of this.particles) {
      const t = Math.max(0, 1 - p.age / p.life);
      // fade and slight darkening over lifetime
      const alpha = 0.95 * (t * t);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `rgba(${p.rgb},1)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.4, p.r), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  _caretCanvasPos() {
    const rect = this._getCaretClientRect();
    if (!rect) return null;const p = this._clientToCanvas(rect.left, rect.top + rect.height);
    return p;}

  _tick = () => {
    // Auto-destroy if element is removed to prevent RAF leak
    if (!document.body.contains(this.inputEl) || !this.wrapper || !document.body.contains(this.wrapper)) {
      this.destroy();
      return;}
    const now = performance.now();
    const dt = now - this.lastTime;
    this.lastTime = now;
    const pos = this._caretCanvasPos();
    if (pos) {
      if (!this.lastCaretPos) {
        this.lastCaretPos = pos;
      } else {
        const moved = Math.hypot(pos.x - this.lastCaretPos.x, pos.y - this.lastCaretPos.y);
        if (moved > 0.5) {
          this._drawSegment(this.lastCaretPos, pos, dt);
          this.lastCaretPos = pos;
        } else {
          // stationary: only emit chips if within keypress window
          if (performance.now() <= this._keyChipUntil) {
            this._emitChips(pos.x, pos.y + 3, 0.2, 0.6, 1);
          }
          if (this.penIcon) {
            this.penIcon.style.left = Math.max(0, pos.x - 18) + 'px';
            this.penIcon.style.top = Math.max(0, pos.y - 26) + 'px';
            this.penIcon.style.opacity = '1';
          }
          this._updateParticles(dt);
          this._renderParticles();
        }
      }
    } else {
      this.lastCaretPos = null;
      if (this.penIcon) this.penIcon.style.opacity = '0';
    }
    this._raf = requestAnimationFrame(this._tick);
  }

  _resetCaretSoon() {
    requestAnimationFrame(() => {
      this.lastCaretPos = this._caretCanvasPos();
      this.lastTime = performance.now();
    });
  }

  _onBlur() { this.lastCaretPos = null; }

  destroy() {
    if (this._destroyed) return;this._destroyed = true;
    this._unBind();
    this._resizeObserver && this._resizeObserver.disconnect();
    cancelAnimationFrame(this._raf);
    if (this._cleanupIconHandlers) this._cleanupIconHandlers();
    if (this.canvasInk && this.canvasInk.parentElement) {
      this.canvasInk.parentElement.removeChild(this.canvasInk);
    }
    if (this.canvasFX && this.canvasFX.parentElement) {
      this.canvasFX.parentElement.removeChild(this.canvasFX);
    }
    if (this.penIcon && this.penIcon.parentElement) {
      this.penIcon.parentElement.removeChild(this.penIcon);
    }
    // Do not unwrap the input; non-destructive cleanup
  }
}

export { PenInkOverlay };


