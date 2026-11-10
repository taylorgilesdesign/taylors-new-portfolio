/* ==========================================================================
   CURSOR — a small makeup brush with a champagne glow and golden sparkles
   --------------------------------------------------------------------------
   • Only on devices with a mouse / fine pointer that can hover.
   • The brush tip is the exact click point.
   • The sparkle canvas and brush never receive clicks (pointer-events: none).
   • Native cursor is kept if anything fails, over text fields, and on touch.
   • Reduced motion: no sparkles, glow stays static.
   ========================================================================== */
(function () {
  'use strict';

  var MAX_PARTICLES = 46;
  var SPAWN_DISTANCE = 11;          // px of movement per sparkle
  var COLORS = ['#f7e1a1', '#e9c46a', '#fff3d1', '#d9ad55', '#c8963e'];
  var EDITABLE = 'input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]), textarea, select, [contenteditable="true"]';
  var INTERACTIVE = 'a[href], button:not(:disabled), [role="button"], label, summary, .drawer-btn, [data-zoom], [data-canvas], .can-zoom > img, .is-zoomed > img';

  var root = document.documentElement;
  var brush, canvas, ctx, dpr = 1;
  var particles = [];
  var raf = 0;
  var last = null;
  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  // ANY mouse or trackpad, not just the "primary" pointer: touchscreen laptops
  // and 2-in-1s often report touch as primary even when a trackpad is in use.
  var fineMQ = window.matchMedia('(any-hover: hover) and (any-pointer: fine)');
  var active = false;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
  }

  function spawn(x, y) {
    if (particles.length >= MAX_PARTICLES) particles.shift();
    var a = Math.random() * Math.PI * 2;
    var sp = 0.15 + Math.random() * 0.45;
    particles.push({
      x: x + (Math.random() - 0.5) * 6,
      y: y + (Math.random() - 0.5) * 6,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp + 0.12,     // drift gently downward like falling dust
      life: 0,
      max: 420 + Math.random() * 360,  // fades quickly
      size: 0.9 + Math.random() * 1.9,
      star: Math.random() < 0.38,      // some are tiny four-point stars
      color: COLORS[(Math.random() * COLORS.length) | 0],
      spin: Math.random() * Math.PI
    });
  }

  function drawStar(x, y, r, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    for (var i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(r * 0.18, r * 0.18, 0, r * 2.4);
      ctx.quadraticCurveTo(-r * 0.18, r * 0.18, 0, 0);
    }
    ctx.fill();
    ctx.restore();
  }

  var prevT = 0;
  function frame(t) {
    raf = 0;
    var dt = prevT ? Math.min(48, t - prevT) : 16;
    prevT = t;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.life += dt;
      if (p.life >= p.max) { particles.splice(i, 1); continue; }
      p.x += p.vx * dt / 16;
      p.y += p.vy * dt / 16;
      var k = p.life / p.max;
      var alpha = (1 - k) * (0.65 + 0.35 * Math.sin(p.life / 55 + p.spin));
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = p.color;
      ctx.shadowColor = 'rgba(255, 220, 150, .8)';
      ctx.shadowBlur = 4;
      if (p.star) drawStar(p.x, p.y, p.size * (1 - k * 0.4), p.spin + p.life / 400);
      else { ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 - k * 0.5), 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    if (particles.length) raf = requestAnimationFrame(frame);
    else { prevT = 0; ctx.clearRect(0, 0, canvas.width, canvas.height); }
  }

  function kick() { if (!raf && !document.hidden) raf = requestAnimationFrame(frame); }

  function stopSparkles() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0; prevT = 0;
    particles.length = 0;
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function onMove(e) {
    if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') { brush.classList.add('is-hidden'); return; }
    var x = e.clientX, y = e.clientY;
    brush.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';

    var t = e.target instanceof Element ? e.target : null;
    // Over text fields and the drawing-set viewer the normal cursor is used,
    // so the brush never covers precise controls or the sheet corners.
    var overEditable = t && ((t.closest(EDITABLE) && !t.closest(EDITABLE).disabled) || t.closest('[data-native-cursor]'));
    brush.classList.toggle('is-hidden', !!overEditable);
    brush.classList.toggle('is-interactive', !!(t && t.closest(INTERACTIVE)));

    if (reduceMQ.matches || overEditable) { last = { x: x, y: y }; return; }
    if (!last) { last = { x: x, y: y }; return; }
    var dx = x - last.x, dy = y - last.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist >= SPAWN_DISTANCE) {
      var n = Math.min(3, Math.floor(dist / SPAWN_DISTANCE));
      for (var i = 1; i <= n; i++) spawn(last.x + dx * i / n, last.y + dy * i / n);
      last = { x: x, y: y };
      kick();
    }
  }

  function enable() {
    if (active) return;
    active = true;
    root.classList.add('has-brush');
    brush.classList.add('is-hidden');            // shown on first movement
    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerdown', onDown, { passive: true });
    document.addEventListener('pointerup', onUp, { passive: true });
    document.documentElement.addEventListener('mouseleave', onLeave);
    document.addEventListener('visibilitychange', onVisibility);
  }

  function disable() {
    if (!active) return;
    active = false;
    root.classList.remove('has-brush');
    stopSparkles();
    window.removeEventListener('resize', resize);
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerdown', onDown);
    document.removeEventListener('pointerup', onUp);
    document.documentElement.removeEventListener('mouseleave', onLeave);
    document.removeEventListener('visibilitychange', onVisibility);
  }

  function onDown(e) {
    if (e.pointerType === 'touch') { brush.classList.add('is-hidden'); return; }
    brush.classList.add('is-pressed');
  }
  function onUp() { brush.classList.remove('is-pressed'); }
  function onLeave() { brush.classList.add('is-hidden'); last = null; }
  function onVisibility() { if (document.hidden) { stopSparkles(); last = null; } }

  function init() {
    brush = document.getElementById('brush-cursor');
    canvas = document.getElementById('sparkle-layer');
    if (!brush || !canvas || !canvas.getContext) return;
    ctx = canvas.getContext('2d');
    if (!ctx) return;

    var img = brush.querySelector('img');
    var ready = img && img.decode ? img.decode() : Promise.resolve();
    ready.then(function () {
      if (!img.naturalWidth) throw new Error('cursor image missing');
      if (fineMQ.matches) enable();
      // React if a mouse is connected / disconnected (e.g. tablets, laptops).
      var onChange = function () { if (fineMQ.matches) enable(); else disable(); };
      if (fineMQ.addEventListener) fineMQ.addEventListener('change', onChange);
      // Safety net: whenever a real mouse or pen moves, turn the brush on,
      // even if the device didn't report one. (Touch never turns it on.)
      document.addEventListener('pointermove', function (e) {
        if (!active && (e.pointerType === 'mouse' || e.pointerType === 'pen')) { enable(); onMove(e); }
      }, { passive: true });
      var onReduce = function () { if (reduceMQ.matches) stopSparkles(); };
      if (reduceMQ.addEventListener) reduceMQ.addEventListener('change', onReduce);
    }).catch(function () {
      // Brush artwork failed to load: keep the normal cursor.
      disable();
    });
  }

  window.AIL = window.AIL || {};
  window.AIL.cursor = {
    init: init,
    isActive: function () { return active; },
    particleCount: function () { return particles.length; },
    running: function () { return !!raf; }
  };
})();
