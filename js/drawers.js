/* ==========================================================================
   DRAWERS — geometry, hotspots, and the pull-forward animation
   --------------------------------------------------------------------------
   All coordinates below were measured in pixels from the original
   assets/images/vanity-home.png (1672 × 941). They mark the wooden drawer
   FRONTS, just inside the thin dark reveal that surrounds each one.

   Everything is converted to percentages of the image, so the buttons and
   animation layers stay locked to the drawers at any screen size.
   ========================================================================== */
(function () {
  'use strict';

  var GEOMETRY = {
    imageWidth: 1672,
    imageHeight: 941,
    // left, centre, right columns (x = left edge, w = width)
    columns: [
      { x: 279,  w: 361 },
      { x: 664,  w: 352 },
      { x: 1039, w: 359 }
    ],
    // top, middle, bottom rows (y = top edge, h = height)
    rows: [
      { y: 593, h: 71 },
      { y: 684, h: 71 },
      { y: 775, h: 71 }
    ],
    // Approximate vanishing point of the render. Drawers scale away from
    // this point as they come forward, which gives a natural perspective.
    vanishingPoint: { x: 836, y: 470 },
    // How much of the sideways perspective drift to keep (0 = none, 1 = full).
    // Softened so side drawers don't appear to slide past the cabinet.
    lateralPerspective: 0.35,
    // How far a drawer comes forward (1 = closed). 1.11 ≈ a gentle pull.
    pullScale: 1.11
  };

  var POSITIONS = [
    'Top left', 'Top centre', 'Top right',
    'Middle left', 'Middle centre', 'Middle right',
    'Bottom left', 'Bottom centre', 'Bottom right'
  ];

  var TIMING = {
    pull: 680,       // drawer coming forward
    push: 480,       // drawer returning
    easeOut: 'cubic-bezier(.2, .78, .22, 1)',
    easeInOut: 'cubic-bezier(.55, 0, .3, 1)'
  };

  var state = {
    stage: null,
    image: null,
    rig: null,
    cavity: null,
    front: null,
    buttons: {},
    rects: {},          // id -> {x,y,w,h} in image pixels
    activeId: null,
    W: GEOMETRY.imageWidth,
    H: GEOMETRY.imageHeight
  };

  function pct(n) { return (Math.round(n * 10000) / 10000) + '%'; }

  /* Place an element over a rectangle given in image pixels. */
  function placeOver(el, r) {
    el.style.left = pct(r.x / state.W * 100);
    el.style.top = pct(r.y / state.H * 100);
    el.style.width = pct(r.w / state.W * 100);
    el.style.height = pct(r.h / state.H * 100);
  }

  /* Show exactly this rectangle of the vanity image as an element background. */
  function cropBackground(el, r) {
    var src = state.image.currentSrc || state.image.src;
    el.style.backgroundImage = 'url("' + src + '")';
    el.style.backgroundSize = pct(state.W / r.w * 100) + ' ' + pct(state.H / r.h * 100);
    el.style.backgroundPosition = pct(r.x / (state.W - r.w) * 100) + ' ' + pct(r.y / (state.H - r.h) * 100);
  }

  function buildRects(order) {
    order.forEach(function (id, i) {
      var col = GEOMETRY.columns[i % 3];
      var row = GEOMETRY.rows[Math.floor(i / 3)];
      state.rects[id] = { x: col.x, y: row.y, w: col.w, h: row.h, index: i };
    });
  }

  function createButtons(nav, order, sections, onSelect) {
    order.forEach(function (id, i) {
      var sec = sections[id];
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'drawer-btn';
      btn.id = 'drawer-' + id;
      btn.dataset.section = id;
      btn.setAttribute('aria-haspopup', 'dialog');
      btn.setAttribute('aria-describedby', 'drawer-hint');
      btn.innerHTML = '<span class="drawer-btn__label">' + escapeHtml(sec.label) + '</span>';
      placeOver(btn, state.rects[id]);
      btn.addEventListener('click', function () { onSelect(id, btn); });
      // Keep the hover label clear of the brush cursor: it normally sits above
      // the knob, and drops below it if the pointer moves up near it
      // (with a little hysteresis so it doesn't flicker).
      btn.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') return;
        var r = btn.getBoundingClientRect();
        var fy = (e.clientY - r.top) / r.height;
        var low = btn.dataset.labelPos === 'low';
        if (!low && fy < 0.34) btn.dataset.labelPos = 'low';
        else if (low && fy > 0.46) delete btn.dataset.labelPos;
      });
      btn.addEventListener('pointerleave', function () { delete btn.dataset.labelPos; btn.classList.remove('is-hover'); });
      // Show the title for any mouse / pen hover, whatever the device reports
      // about itself (CSS :hover alone is skipped on some touchscreen laptops).
      btn.addEventListener('pointerenter', function (e) {
        if (e.pointerType === 'mouse' || e.pointerType === 'pen') btn.classList.add('is-hover');
      });
      nav.appendChild(btn);
      state.buttons[id] = btn;
    });
    var hint = document.createElement('span');
    hint.id = 'drawer-hint';
    hint.className = 'visually-hidden';
    hint.textContent = 'Opens this drawer of the portfolio';
    nav.appendChild(hint);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---- Animation ------------------------------------------------------- */

  function prepareRig(id) {
    var r = state.rects[id];
    var vp = GEOMETRY.vanishingPoint;
    // Cavity covers the front plus its 1px reveal so no duplicate edge shows.
    placeOver(state.cavity, { x: r.x - 1, y: r.y - 1, w: r.w + 2, h: r.h + 2 });
    placeOver(state.front, r);
    cropBackground(state.front, r);
    // Scale away from the vanishing point = moving toward the viewer.
    var cx = r.x + r.w / 2;
    var ox = cx + (vp.x - cx) * GEOMETRY.lateralPerspective;
    state.front.style.transformOrigin =
      pct((ox - r.x) / r.w * 100) + ' ' + pct((vp.y - r.y) / r.h * 100);
    state.rig.hidden = false;
    state.rig.dataset.drawer = id;
    state.activeId = id;
    state.stage.classList.add('has-open-drawer');
    state.buttons[id].classList.add('is-active');
  }

  function frontKeyframes() {
    var s = GEOMETRY.pullScale;
    return [
      { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(28, 14, 6, 0), 0 0 0 0 rgba(28, 14, 6, 0)', filter: 'brightness(1)' },
      { transform: 'scale(' + (1 + (s - 1) * 0.55) + ')', boxShadow: '0 10px 16px -8px rgba(28, 14, 6, .55), 0 2px 3px rgba(28, 14, 6, .3)', filter: 'brightness(1.04)', offset: 0.45 },
      { transform: 'scale(' + s + ')', boxShadow: '0 22px 30px -12px rgba(28, 14, 6, .72), 0 3px 5px rgba(28, 14, 6, .38)', filter: 'brightness(1.07)' }
    ];
  }

  function cancelRunning() {
    [state.front, state.cavity].forEach(function (el) {
      el.getAnimations().forEach(function (a) { a.cancel(); });
    });
  }

  /* Pull a drawer forward. Returns a Promise that resolves when it settles. */
  function pull(id, reduced) {
    cancelRunning();
    prepareRig(id);
    if (reduced) {
      state.rig.classList.add('is-static');
      return Promise.resolve();
    }
    state.rig.classList.remove('is-static');
    var anim = state.front.animate(frontKeyframes(), {
      duration: TIMING.pull, easing: TIMING.easeOut, fill: 'forwards'
    });
    void state.cavity.offsetWidth;            // start the glow transition from "off"
    state.cavity.classList.add('is-lit');
    return anim.finished.catch(function () {});
  }

  /* Push the active drawer back. Resolves once it is flush and hidden. */
  function push(reduced) {
    var id = state.activeId;
    if (!id) return Promise.resolve();
    var done = function () {
      cancelRunning();
      state.rig.hidden = true;
      state.cavity.classList.remove('is-lit');
      state.stage.classList.remove('has-open-drawer');
      if (state.buttons[id]) state.buttons[id].classList.remove('is-active');
      state.activeId = null;
    };
    if (reduced || state.rig.classList.contains('is-static')) {
      done();
      return Promise.resolve();
    }
    state.cavity.classList.remove('is-lit');
    var kf = frontKeyframes().slice().reverse().map(function (k) {
      var c = Object.assign({}, k); delete c.offset; return c;
    });
    kf[1].offset = 0.6;
    var anim = state.front.animate(kf, {
      duration: TIMING.push, easing: TIMING.easeInOut, fill: 'forwards'
    });
    return anim.finished.catch(function () {}).then(function () {
      // Hold flush for a frame, then fade the layers out so the hand-off is invisible.
      var fade = state.front.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 90, fill: 'forwards' });
      var fade2 = state.cavity.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 90, fill: 'forwards' });
      return Promise.all([fade.finished, fade2.finished]).catch(function () {});
    }).then(done);
  }

  /* Bounding box (viewport px) of the pulled drawer front, for the panel hand-off. */
  function frontViewportRect() {
    if (!state.activeId) return null;
    return state.front.getBoundingClientRect();
  }

  function checkIntrinsicSize() {
    var img = state.image;
    if (img.naturalWidth && (img.naturalWidth !== GEOMETRY.imageWidth || img.naturalHeight !== GEOMETRY.imageHeight)) {
      // The drawer coordinates were measured on a 1672 × 941 image. If the image
      // is swapped for a different size but the same proportions, percentages
      // still line up; if the proportions differ they must be re-measured.
      var sameRatio = Math.abs(img.naturalWidth / img.naturalHeight - GEOMETRY.imageWidth / GEOMETRY.imageHeight) < 0.002;
      console.warn('[An Inside Look] vanity-home.png is ' + img.naturalWidth + '×' + img.naturalHeight +
        ' but drawer positions were measured on ' + GEOMETRY.imageWidth + '×' + GEOMETRY.imageHeight + '.' +
        (sameRatio ? ' Proportions match, so the drawers should still align.' : ' Proportions differ — re-measure the drawers in js/drawers.js.'));
    }
  }

  function init(opts) {
    state.stage = opts.stage;
    state.image = opts.image;
    state.rig = opts.rig;
    state.cavity = opts.rig.querySelector('.rig__cavity');
    state.front = opts.rig.querySelector('.rig__front');
    buildRects(opts.order);
    createButtons(opts.nav, opts.order, opts.sections, opts.onSelect);
    if (state.image.complete) checkIntrinsicSize();
    else state.image.addEventListener('load', checkIntrinsicSize, { once: true });
  }

  window.AIL = window.AIL || {};
  window.AIL.drawers = {
    GEOMETRY: GEOMETRY,
    POSITIONS: POSITIONS,
    TIMING: TIMING,
    init: init,
    pull: pull,
    push: push,
    frontViewportRect: frontViewportRect,
    button: function (id) { return state.buttons[id]; },
    activeId: function () { return state.activeId; },
    rect: function (id) { return state.rects[id]; }
  };
})();
