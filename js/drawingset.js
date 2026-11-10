/* ==========================================================================
   DRAWING SET — the Technical Drawings drawer
   --------------------------------------------------------------------------
   Shows the working-drawing sheets like a physical set bound along its left
   edge. Visitors click or drag a corner to turn a sheet: it folds along a
   crease that follows the pointer, with the paper's back (faint reversed
   linework showing through), a soft curl highlight and shadows.

   Zoom is a separate "inspect" mode (button, click the middle of a sheet,
   double-click, or pinch on touch) with pan, wheel / pinch zoom and buttons,
   using a high-resolution render of the sheet.

   Sheets are pre-rendered images listed in data/portfolio.js (drawings.set).
   Reduced motion: sheets change with a simple fade, no folding.
   ========================================================================== */
(function () {
  'use strict';

  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var PAPER = '#f8f6f1';           // back of the sheet / blank paper
  var TURN_MS = 900;
  var cache = {};

  function load(src) {
    if (!cache[src]) {
      cache[src] = new Promise(function (resolve, reject) {
        var im = new Image();
        im.decoding = 'async';
        im.onload = function () { resolve(im); };
        im.onerror = reject;
        im.src = src;
      });
    }
    return cache[src];
  }

  /* ---- geometry helpers (sheet space: 0..W, 0..H) ---------------------- */

  // Keep the part of a polygon on one side of the fold line.
  function clipPoly(poly, M, n, positive) {
    var out = [];
    var f = function (p) { var v = (p.x - M.x) * n.x + (p.y - M.y) * n.y; return positive ? v : -v; };
    for (var i = 0; i < poly.length; i++) {
      var a = poly[i], b = poly[(i + 1) % poly.length], fa = f(a), fb = f(b);
      if (fa >= 0) out.push(a);
      if ((fa >= 0) !== (fb >= 0)) {
        var t = fa / (fa - fb);
        out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      }
    }
    return out;
  }
  function reflect(p, M, n) {
    var d = (p.x - M.x) * n.x + (p.y - M.y) * n.y;
    return { x: p.x - 2 * d * n.x, y: p.y - 2 * d * n.y };
  }
  function trace(ctx, poly) {
    ctx.beginPath();
    poly.forEach(function (p, i) { if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); });
    ctx.closePath();
  }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  /* ---- one viewer ------------------------------------------------------- */

  function setup(root) {
    if (root.__dset) return;
    root.__dset = true;

    var sheets;
    try { sheets = JSON.parse(root.getAttribute('data-dset') || '[]'); } catch (e) { sheets = []; }
    if (!sheets.length) return;

    var q = function (s) { return root.querySelector(s); };
    var stage = q('[data-dset-stage]');
    var canvas = stage.querySelector('canvas');
    var ctx = canvas.getContext('2d');
    var zoomBox = q('[data-dset-zoom]');
    var zoomImg = zoomBox.querySelector('img');
    var countEl = q('[data-dset-count]');
    var nameEl = q('[data-dset-name]');
    var zoomLabel = q('[data-dset-zoomlabel]');
    var live = q('[data-dset-live]');
    var hint = q('[data-dset-hint]');
    var btnPrev = q('[data-act="prev"]'), btnNext = q('[data-act="next"]');

    var idx = 0, W = 0, H = 0, dpr = 1, padX = 0, padY = 0;
    var imgs = [];
    var turn = null;        // { fi, ui, C, P, dir, alpha }  fi/ui = front / under sheet index
    var peel = null;        // small hover curl, same shape as turn
    var busy = false, raf = 0, inspect = false, hinted = false;


    function ensure(i) {
      if (i < 0 || i >= sheets.length) return Promise.resolve(null);
      if (imgs[i]) return Promise.resolve(imgs[i]);
      return load(sheets[i].image).then(function (im) { imgs[i] = im; render(); return im; }, function () { return null; });
    }
    function ensureAround() { ensure(idx); ensure(idx + 1); ensure(idx - 1); }

    /* -- sizing -- */
    function resize() {
      if (!root.isConnected) { if (ro) ro.disconnect(); return; }
      var r = stage.getBoundingClientRect();
      if (!r.width) return;
      W = r.width; H = r.height;
      padX = Math.round(W * 0.06); padY = Math.round(H * 0.1);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.style.left = -padX + 'px';
      canvas.style.top = -padY + 'px';
      canvas.style.width = (W + 2 * padX) + 'px';
      canvas.style.height = (H + 2 * padY) + 'px';
      canvas.width = Math.round((W + 2 * padX) * dpr);
      canvas.height = Math.round((H + 2 * padY) * dpr);
      render();
      if (inspect) refit();
    }
    var ro = window.ResizeObserver ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(stage); else window.addEventListener('resize', resize);

    /* -- drawing -- */
    function drawSheet(im) {
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, W, H);
      if (im) ctx.drawImage(im, 0, 0, W, H);
    }
    function drawStack() {
      // the rest of the set beneath, offset like a thick bound stack
      var left = sheets.length - 1 - idx;
      ctx.save();
      ctx.shadowColor = 'rgba(8, 4, 2, .5)';
      ctx.shadowBlur = 34;
      ctx.shadowOffsetY = 16;
      ctx.fillStyle = '#e6e0d4';
      ctx.fillRect(left > 1 ? 5 : 2, left > 1 ? 5 : 2, W, H);
      ctx.restore();
      if (left > 0) { ctx.fillStyle = '#eee9e0'; ctx.fillRect(2.5, 2.5, W, H); }
    }
    function drawBinding() {
      // a dark bound edge with two fasteners, on the left margin of the set
      var bw = Math.max(5, W * 0.011);
      var g = ctx.createLinearGradient(0, 0, bw * 1.8, 0);
      g.addColorStop(0, '#1d140e'); g.addColorStop(0.55, '#2f2219'); g.addColorStop(1, 'rgba(47, 34, 25, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, bw * 1.8, H);
      ctx.fillStyle = 'rgba(214, 189, 140, .55)';
      [0.2, 0.8].forEach(function (f) { ctx.beginPath(); ctx.arc(bw * 0.55, H * f, Math.max(1.6, bw * 0.22), 0, Math.PI * 2); ctx.fill(); });
    }
    function clampP(P, C) {
      var p = { x: P.x, y: P.y };
      var S = { x: 0, y: C.y }, d = Math.hypot(p.x - S.x, p.y - S.y);
      if (d > W) { p.x = S.x + (p.x - S.x) * W / d; p.y = S.y + (p.y - S.y) * W / d; }
      var S2 = { x: 0, y: H - C.y }, D = Math.hypot(W, H), d2 = Math.hypot(p.x - S2.x, p.y - S2.y);
      if (d2 > D) { p.x = S2.x + (p.x - S2.x) * D / d2; p.y = S2.y + (p.y - S2.y) * D / d2; }
      return p;
    }

    function render() {
      if (!W) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W + 2 * padX, H + 2 * padY);
      ctx.translate(padX, padY);
      drawStack();

      var t = turn || peel;
      if (!t) { drawSheet(imgs[idx]); drawBinding(); return; }

      var C = t.C, P = clampP(t.P, C);
      var dx = C.x - P.x, dy = C.y - P.y, len = Math.hypot(dx, dy);
      if (len < 0.5) { drawSheet(imgs[t.fi]); drawBinding(); return; }
      var n = { x: dx / len, y: dy / len }, M = { x: (C.x + P.x) / 2, y: (C.y + P.y) / 2 };
      var rect = [{ x: 0, y: 0 }, { x: W, y: 0 }, { x: W, y: H }, { x: 0, y: H }];
      var front = clipPoly(rect, M, n, false);
      var removed = clipPoly(rect, M, n, true);
      var flap = removed.map(function (p) { return reflect(p, M, n); });
      var reach = Math.min(110, len * 0.6);

      // 1. the sheet underneath, revealed where the turning sheet has lifted
      drawSheet(imgs[t.ui]);
      if (removed.length > 2) {
        ctx.save(); trace(ctx, removed); ctx.clip();
        var gu = ctx.createLinearGradient(M.x, M.y, M.x + n.x * reach, M.y + n.y * reach);
        gu.addColorStop(0, 'rgba(24, 14, 8, .42)'); gu.addColorStop(1, 'rgba(24, 14, 8, 0)');
        ctx.fillStyle = gu; ctx.fillRect(-padX, -padY, W + 2 * padX, H + 2 * padY);
        ctx.restore();
      }
      // 2. the part of the turning sheet still lying flat, darkening as it bends
      if (front.length > 2) {
        ctx.save(); trace(ctx, front); ctx.clip();
        drawSheet(imgs[t.fi]);
        var gf = ctx.createLinearGradient(M.x, M.y, M.x - n.x * reach * 0.5, M.y - n.y * reach * 0.5);
        gf.addColorStop(0, 'rgba(24, 14, 8, .16)'); gf.addColorStop(1, 'rgba(24, 14, 8, 0)');
        ctx.fillStyle = gf; ctx.fillRect(-padX, -padY, W + 2 * padX, H + 2 * padY);
        ctx.restore();
      }
      drawBinding();
      // 3. the folded-over flap: the paper's back, curled
      if (flap.length > 2) {
        ctx.save();
        ctx.globalAlpha = t.alpha == null ? 1 : t.alpha;
        ctx.save();
        ctx.shadowColor = 'rgba(10, 5, 2, .45)';
        ctx.shadowBlur = 24;
        ctx.shadowOffsetX = -n.x * 8;
        ctx.shadowOffsetY = -n.y * 8 + 5;
        trace(ctx, flap); ctx.fillStyle = PAPER; ctx.fill();
        ctx.restore();
        trace(ctx, flap); ctx.clip();
        // faint reversed linework showing through the paper
        var im = imgs[t.fi];
        if (im) {
          var k = 2 * (M.x * n.x + M.y * n.y);
          ctx.save();
          ctx.globalAlpha *= 0.07;
          ctx.transform(1 - 2 * n.x * n.x, -2 * n.x * n.y, -2 * n.x * n.y, 1 - 2 * n.y * n.y, k * n.x, k * n.y);
          ctx.drawImage(im, 0, 0, W, H);
          ctx.restore();
        }
        var L = 1;
        flap.forEach(function (p) { L = Math.max(L, -((p.x - M.x) * n.x + (p.y - M.y) * n.y)); });
        var gc = ctx.createLinearGradient(M.x, M.y, M.x - n.x * L, M.y - n.y * L);
        gc.addColorStop(0, 'rgba(70, 48, 30, .26)');
        gc.addColorStop(0.1, 'rgba(255, 255, 255, 0)');
        gc.addColorStop(0.32, 'rgba(255, 255, 255, .42)');
        gc.addColorStop(0.62, 'rgba(255, 255, 255, 0)');
        gc.addColorStop(1, 'rgba(70, 48, 30, .12)');
        ctx.fillStyle = gc;
        ctx.fillRect(-padX * 4, -padY * 4, W + padX * 8, H + padY * 8);
        ctx.restore();
      }
    }

    /* -- motion -- */
    function animate(t, from, to, dur, alphaFn, done) {
      cancelAnimationFrame(raf);
      busy = true;
      var start = performance.now();
      var dir = t.C.y > H / 2 ? -1 : 1;
      var travel = Math.abs(to.x - from.x) / (2 * W);
      function step(now) {
        var e = Math.min(1, (now - start) / dur), k = ease(e);
        var lift = Math.sin(Math.PI * k) * H * 0.12 * travel * dir;
        t.P = { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k + lift };
        t.alpha = alphaFn ? alphaFn(e) : 1;
        render();
        if (e < 1) raf = requestAnimationFrame(step);
        else { busy = false; done(); }
      }
      raf = requestAnimationFrame(step);
    }

    function go(dir, top) {
      if (busy || inspect) return;
      var target = idx + dir;
      if (target < 0 || target >= sheets.length) { if (turn) springBack(); return; }
      hideHint();
      peel = null;
      if (reduceMQ.matches) {
        turn = null; idx = target; changed();
        ensure(idx).then(function () {
          render();
          if (canvas.animate) canvas.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 200, easing: 'ease-out' });
        });
        return;
      }
      Promise.all([ensure(idx), ensure(target)]).then(function () {
        var C = { x: W, y: top ? 0 : H };
        if (dir > 0) {
          if (!turn || turn.dir !== 1) turn = { fi: idx, ui: target, C: C, P: { x: C.x, y: C.y }, dir: 1 };
          animate(turn, turn.P, { x: -W, y: turn.C.y }, TURN_MS, function (e) { return e > 0.86 ? (1 - e) / 0.14 : 1; }, finish);
        } else {
          if (!turn || turn.dir !== -1) turn = { fi: target, ui: idx, C: C, P: { x: -W, y: C.y }, dir: -1 };
          animate(turn, turn.P, { x: turn.C.x, y: turn.C.y }, TURN_MS, function (e) { return e < 0.14 ? e / 0.14 : 1; }, finish);
        }
        function finish() { turn = null; idx = target; changed(); render(); }
      });
    }
    function springBack() {
      if (!turn) return;
      var t = turn;
      var to = t.dir > 0 ? { x: t.C.x, y: t.C.y } : { x: -W, y: t.C.y };
      animate(t, t.P, to, 420, t.dir > 0 ? null : function (e) { return e > 0.8 ? (1 - e) / 0.2 : 1; }, function () { turn = null; render(); });
    }

    function changed() {
      var s = sheets[idx];
      var label = [s.number, s.name].filter(Boolean).join(' · ');
      countEl.textContent = 'Sheet ' + pad2(idx + 1) + ' / ' + pad2(sheets.length);
      if (nameEl) nameEl.textContent = label;
      btnPrev.disabled = idx === 0;
      btnNext.disabled = idx === sheets.length - 1;
      stage.setAttribute('aria-label', 'Sheet ' + (idx + 1) + ' of ' + sheets.length + ': ' + label +
        '. Use the left and right arrow keys to turn sheets, and Enter to zoom in.');
      if (live) live.textContent = 'Sheet ' + (idx + 1) + ' of ' + sheets.length + ': ' + label;
      ensureAround();
    }
    function hideHint() { if (!hinted && hint) { hinted = true; hint.classList.add('is-hidden'); } }

    /* -- pointer: turning sheets -- */
    function local(e) { var r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    function mapP(p) { return { x: 2 * p.x - W, y: Math.max(-H * 0.05, Math.min(H * 1.05, p.y)) }; }
    function zoneDir(p) {
      if (p.x > W * 0.76 && idx < sheets.length - 1) return 1;
      if (p.x < W * 0.24 && idx > 0) return -1;
      return 0;
    }
    function setCursor(c) { stage.dataset.cursor = c; }

    var drag = null, touches = new Map();

    stage.addEventListener('pointerdown', function (e) {
      if (inspect || e.button > 0) return;
      if (e.pointerType === 'touch') {
        touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (touches.size === 2) {           // pinch on a sheet → inspect it
          var pts = Array.from(touches.values()), r = stage.getBoundingClientRect();
          touches.clear(); drag = null;
          if (turn && !busy) { turn = null; render(); }
          enterInspect({ x: (pts[0].x + pts[1].x) / 2 - r.left, y: (pts[0].y + pts[1].y) / 2 - r.top }, 2);
          return;
        }
      }
      if (busy) return;
      var p = local(e), dir = zoneDir(p);
      drag = { dir: dir, start: p, last: p, moved: false, id: e.pointerId, type: e.pointerType };
      peel = null;
      if (dir && !reduceMQ.matches) {
        ensure(idx); ensure(idx + dir);
        var C = { x: W, y: p.y < H / 2 ? 0 : H };
        turn = dir > 0 ? { fi: idx, ui: idx + 1, C: C, P: mapP(p), dir: 1 } : { fi: idx - 1, ui: idx, C: C, P: mapP(p), dir: -1 };
        render();
        setCursor('grabbing');
      }
      try { stage.setPointerCapture(e.pointerId); } catch (err) {}
    });

    stage.addEventListener('pointermove', function (e) {
      if (inspect) return;
      var p = local(e);
      if (drag && drag.id === e.pointerId) {
        if (Math.hypot(p.x - drag.start.x, p.y - drag.start.y) > 6) drag.moved = true;
        drag.last = p;
        if (turn && drag.dir) { turn.P = mapP(p); render(); }
        return;
      }
      if (e.pointerType !== 'mouse' || busy) return;
      // hover: corners curl up a little to invite a turn
      var dir = zoneDir(p);
      var nearCorner = dir && (p.y < H * 0.3 || p.y > H * 0.7);
      if (nearCorner && !reduceMQ.matches) {
        var top = p.y < H / 2, C = { x: W, y: top ? 0 : H };
        var lift = { x: W * 0.07, y: H * 0.07 * (top ? 1 : -1) };
        peel = dir > 0
          ? { fi: idx, ui: idx + 1, C: C, P: { x: W - lift.x, y: C.y + lift.y }, dir: 1 }
          : { fi: idx - 1, ui: idx, C: C, P: { x: -W + lift.x, y: C.y + lift.y }, dir: -1, alpha: 1 };
        ensure(peel.fi); ensure(peel.ui);
        render();
      } else if (peel) { peel = null; render(); }
      setCursor(dir ? 'grab' : 'zoom-in');
    });

    function endDrag(e, cancelled) {
      touches.delete(e.pointerId);
      if (!drag || drag.id !== e.pointerId) return;
      var d = drag; drag = null;
      setCursor(d.dir ? 'grab' : 'zoom-in');
      if (cancelled) { if (turn) springBack(); return; }
      if (!d.dir) {
        var dx = d.last.x - d.start.x, dy = d.last.y - d.start.y;
        // a horizontal swipe across the middle also turns the sheet
        if (d.moved && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) { go(dx < 0 ? 1 : -1, false); return; }
        if (!d.moved) enterInspect(d.start, 2.2);
        return;
      }
      if (reduceMQ.matches) { go(d.dir, false); return; }
      if (!d.moved) { go(d.dir, turn && turn.C.y === 0); return; }
      var complete = d.dir > 0 ? turn.P.x < W * 0.35 : turn.P.x > -W * 0.35;
      if (complete) go(d.dir, turn.C.y === 0); else springBack();
    }
    stage.addEventListener('pointerup', function (e) { endDrag(e, false); });
    stage.addEventListener('pointercancel', function (e) { endDrag(e, true); });
    stage.addEventListener('pointerleave', function (e) {
      if (e.pointerType === 'mouse' && peel && !drag) { peel = null; render(); }
    });
    stage.addEventListener('dblclick', function (e) { e.preventDefault(); });

    /* -- inspect (zoom and pan) -- */
    var z = { s: 1, fit: 1, tx: 0, ty: 0 };
    var MAX_ZOOM = 6;

    function enterInspect(pt, factor) {
      if (inspect) return;
      inspect = true;
      turn = null; peel = null; cancelAnimationFrame(raf); busy = false;
      root.classList.add('is-inspecting');
      zoomBox.hidden = false;
      var s = sheets[idx];
      zoomImg.alt = [s.number, s.name].filter(Boolean).join(' · ');
      var start = function () {
        z.fit = W / zoomImg.naturalWidth;
        z.s = z.fit; z.tx = 0; z.ty = 0;
        if (factor) zoomAt(pt || { x: W / 2, y: H / 2 }, z.fit * factor); else apply();
      };
      // While the high-resolution sheet loads, the regular one shows behind it.
      var hd = s.hd || s.image;
      zoomBox.style.backgroundImage = 'url("' + String(s.image).replace(/"/g, '%22') + '")';
      zoomImg.onload = null;
      if (zoomImg.getAttribute('src') === hd && zoomImg.complete && zoomImg.naturalWidth) start();
      else {
        zoomImg.style.visibility = 'hidden';
        zoomImg.onload = function () { zoomImg.style.visibility = ''; if (inspect) start(); };
        zoomImg.src = hd;
      }
      zoomBox.focus({ preventScroll: true });
      if (live) live.textContent = 'Zoom view. Drag to move around; use plus and minus to zoom; Escape to return to the sheets.';
    }
    function exitInspect() {
      if (!inspect) return;
      inspect = false;
      root.classList.remove('is-inspecting');
      zoomBox.hidden = true;
      render();
      stage.focus({ preventScroll: true });
    }
    function clampT() {
      var iw = zoomImg.naturalWidth * z.s, ih = zoomImg.naturalHeight * z.s;
      z.tx = iw <= W ? (W - iw) / 2 : Math.min(0, Math.max(W - iw, z.tx));
      z.ty = ih <= H ? (H - ih) / 2 : Math.min(0, Math.max(H - ih, z.ty));
    }
    function apply() {
      clampT();
      zoomImg.style.transform = 'translate(' + z.tx + 'px,' + z.ty + 'px) scale(' + z.s + ')';
      if (zoomLabel) zoomLabel.textContent = Math.round(z.s / z.fit * 100) + '%';
      zoomBox.dataset.zoomed = z.s > z.fit * 1.01 ? 'true' : 'false';
    }
    function zoomAt(pt, s) {
      s = Math.max(z.fit, Math.min(z.fit * MAX_ZOOM, s));
      var ix = (pt.x - z.tx) / z.s, iy = (pt.y - z.ty) / z.s;
      z.s = s; z.tx = pt.x - ix * s; z.ty = pt.y - iy * s;
      apply();
    }
    function refit() {
      if (!zoomImg.naturalWidth) return;
      var rel = z.s / z.fit;
      z.fit = W / zoomImg.naturalWidth;
      zoomAt({ x: W / 2, y: H / 2 }, z.fit * rel);
    }
    function zoomStep(dir) { zoomAt({ x: W / 2, y: H / 2 }, z.s * (dir > 0 ? 1.5 : 1 / 1.5)); }

    var zp = new Map(), pinch = null, pan = null;
    function zlocal(e) { var r = zoomBox.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    zoomBox.addEventListener('pointerdown', function (e) {
      zp.set(e.pointerId, zlocal(e));
      try { zoomBox.setPointerCapture(e.pointerId); } catch (err) {}
      if (zp.size === 2) {
        var a = Array.from(zp.values());
        pinch = { d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), s: z.s };
        pan = null;
      } else if (zp.size === 1) {
        pan = { x: e.clientX, y: e.clientY, tx: z.tx, ty: z.ty, moved: false };
      }
    });
    zoomBox.addEventListener('pointermove', function (e) {
      if (!zp.has(e.pointerId)) return;
      zp.set(e.pointerId, zlocal(e));
      if (pinch && zp.size === 2) {
        var a = Array.from(zp.values());
        var d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
        zoomAt({ x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2 }, pinch.s * d / Math.max(1, pinch.d));
      } else if (pan) {
        var dx = e.clientX - pan.x, dy = e.clientY - pan.y;
        if (Math.abs(dx) + Math.abs(dy) > 4) pan.moved = true;
        z.tx = pan.tx + dx; z.ty = pan.ty + dy; apply();
      }
    });
    function zEnd(e) {
      zp.delete(e.pointerId);
      if (zp.size < 2) pinch = null;
      if (zp.size === 1) { var r = Array.from(zp.values())[0], b = zoomBox.getBoundingClientRect(); pan = { x: r.x + b.left, y: r.y + b.top, tx: z.tx, ty: z.ty, moved: true }; }
      if (zp.size === 0) pan = null;
    }
    zoomBox.addEventListener('pointerup', zEnd);
    zoomBox.addEventListener('pointercancel', zEnd);
    zoomBox.addEventListener('wheel', function (e) {
      e.preventDefault();
      zoomAt(zlocal(e), z.s * Math.exp(-e.deltaY * 0.0016));
    }, { passive: false });
    zoomBox.addEventListener('dblclick', function (e) {
      var p = zlocal(e);
      if (z.s > z.fit * 1.05) zoomAt(p, z.fit); else zoomAt(p, z.fit * 2.5);
    });

    /* -- buttons and keys -- */
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]');
      if (!b || !root.contains(b)) return;
      var a = b.dataset.act;
      if (a === 'prev') go(-1, false);
      else if (a === 'next') go(1, false);
      else if (a === 'inspect') enterInspect(null, 0);
      else if (a === 'close') exitInspect();
      else if (a === 'in') zoomStep(1);
      else if (a === 'out') zoomStep(-1);
      else if (a === 'fit') zoomAt({ x: W / 2, y: H / 2 }, z.fit);
    });
    root.addEventListener('keydown', function (e) {
      if (inspect) {
        var k = e.key;
        if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); exitInspect(); }
        else if (k === '+' || k === '=') { e.preventDefault(); zoomStep(1); }
        else if (k === '-' || k === '_') { e.preventDefault(); zoomStep(-1); }
        else if (k === '0') { e.preventDefault(); zoomAt({ x: W / 2, y: H / 2 }, z.fit); }
        else if (/^Arrow/.test(k) && document.activeElement === zoomBox) {
          e.preventDefault();
          z.tx += k === 'ArrowLeft' ? 80 : k === 'ArrowRight' ? -80 : 0;
          z.ty += k === 'ArrowUp' ? 80 : k === 'ArrowDown' ? -80 : 0;
          apply();
        }
        return;
      }
      if (e.target.closest('a, input, textarea')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1, false); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1, false); }
      else if ((e.key === 'Enter' || e.key === ' ') && e.target === stage) { e.preventDefault(); enterInspect(null, 2); }
    });

    changed();
    resize();
  }

  window.AIL = window.AIL || {};
  window.AIL.drawingSet = {
    mount: function (el) { el.querySelectorAll('[data-dset]').forEach(setup); }
  };
})();
