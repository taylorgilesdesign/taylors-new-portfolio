/* ==========================================================================
   MAIN — connects the vanity, the drawer animation and the portfolio panel
   --------------------------------------------------------------------------
   Phases: idle → opening → open → closing → idle
   Only one drawer / panel can be active, and clicks during a transition
   are ignored so animations never overlap.
   ========================================================================== */
(function () {
  'use strict';

  var P = window.PORTFOLIO;
  var AIL = window.AIL || {};
  var D = AIL.drawers;

  var els = {};
  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var state = { phase: 'idle', sectionId: null, opener: null, menuOpen: false };

  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function $(id) { return document.getElementById(id); }
  function delay(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function reduced() { return reduceMQ.matches; }
  function finished(anim) { return anim && anim.finished ? anim.finished.catch(function () {}) : Promise.resolve(); }

  /* Freeze the vanity page behind a dialog, remembering where the visitor
     had scrolled so they return to exactly the same place. */
  function lockPage(on) {
    if (on) state.savedScroll = window.scrollY || 0;
    document.documentElement.classList.toggle('is-locked', on);
    els.vanity.inert = on;
    if (on) els.vanity.setAttribute('aria-hidden', 'true');
    else {
      els.vanity.removeAttribute('aria-hidden');
      if (Math.abs((window.scrollY || 0) - (state.savedScroll || 0)) > 1) window.scrollTo(0, state.savedScroll || 0);
    }
  }

  /* ---------------------------------------------------------------------
     PANEL
     --------------------------------------------------------------------- */

  function renderPanel(id, view, param) {
    var idx = P.drawers.indexOf(id);
    els.panelMeta.textContent = 'Drawer ' + (idx + 1) + ' of ' + P.drawers.length;
    els.panel.dataset.section = id;
    if (AIL.panels) {
      els.panelContent.innerHTML = AIL.panels.render(id, { view: view || 'index', param: param, mode: 'panel', headingId: 'panel-title' });
      AIL.panels.enhance(els.panelContent, id, { view: view || 'index', param: param });
    } else {
      els.panelContent.innerHTML = '<h2 class="sec-title" id="panel-title" tabindex="-1">' + P.sections[id].title + '</h2>';
    }
  }

  function focusPanelHeading() {
    var h = els.panelContent.querySelector('#panel-title');
    if (h) h.focus({ preventScroll: true });
  }

  /* Insets that clip the panel down to the pulled drawer front. */
  function clipToFront() {
    var fr = D.frontViewportRect();
    var pr = els.panel.getBoundingClientRect();
    if (!fr) return 'inset(45% 45% 45% 45%)';
    var t = Math.max(0, fr.top - pr.top);
    var l = Math.max(0, fr.left - pr.left);
    var r = Math.max(0, pr.right - fr.right);
    var b = Math.max(0, pr.bottom - fr.bottom);
    // If the drawer sits outside the panel (rare), fall back to a centred seed.
    if (t + b >= pr.height - 4 || l + r >= pr.width - 4) return 'inset(45% 45% 45% 45%)';
    return 'inset(' + t + 'px ' + r + 'px ' + b + 'px ' + l + 'px round 2px)';
  }

  function revealPanel() {
    lockPage(true);
    els.scrim.hidden = false;
    els.panel.hidden = false;
    els.panelScroll.scrollTop = 0;
    // Sections with their own opening flourish (the thesis royal scroll).
    if (AIL.panels && AIL.panels.play) AIL.panels.play(els.panelContent);

    if (reduced()) {
      var a = els.panel.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: 'ease-out' });
      els.scrim.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180 });
      return finished(a);
    }

    var from = clipToFront();
    var radius = getComputedStyle(els.panel).borderTopLeftRadius || '0px';
    var anim = els.panel.animate([
      { clipPath: from, opacity: 0 },
      { opacity: 1, offset: 0.3 },
      { clipPath: 'inset(0px 0px 0px 0px round ' + radius + ')', opacity: 1 }
    ], { duration: 600, easing: 'cubic-bezier(.32, .72, .16, 1)' });
    els.scrim.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 480, easing: 'ease-out' });
    els.panelScroll.animate(
      [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }],
      { duration: 460, delay: 300, easing: 'cubic-bezier(.2, .78, .22, 1)', fill: 'backwards' }
    );
    return finished(anim);
  }

  function concealPanel() {
    if (reduced()) {
      var a = els.panel.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' });
      els.scrim.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' });
      return finished(a);
    }
    var to = clipToFront();
    var radius = getComputedStyle(els.panel).borderTopLeftRadius || '0px';
    els.panelScroll.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' });
    var anim = els.panel.animate([
      { clipPath: 'inset(0px 0px 0px 0px round ' + radius + ')', opacity: 1 },
      { opacity: 1, offset: 0.7 },
      { clipPath: to, opacity: 0 }
    ], { duration: 440, easing: 'cubic-bezier(.6, 0, .4, 1)', fill: 'forwards' });
    els.scrim.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 440, easing: 'ease-in', fill: 'forwards' });
    return finished(anim);
  }

  function openSection(id, opener) {
    if (state.phase !== 'idle' || !P.sections[id] || state.menuOpen) return;
    state.phase = 'opening';
    state.sectionId = id;
    state.opener = opener || D.button(id);
    els.stage.classList.add('is-busy');
    renderPanel(id);

    bringDrawerIntoView(id).then(function () {
      var pulled = D.pull(id, reduced());
      var wait = reduced() ? Promise.resolve() : delay(Math.round(D.TIMING.pull * 0.62));
      return wait.then(revealPanel).then(function () { return pulled; });
    }).then(function () {
      state.phase = 'open';
      focusPanelHeading();
      try { history.replaceState(null, '', '#' + id); } catch (e) { /* file:// may refuse */ }
    });
  }

  /* ---------------------------------------------------------------------
     SWIPEABLE ROOM (phones / tablets held upright)
     --------------------------------------------------------------------- */

  var swipeMQ = window.matchMedia('(orientation: portrait) and (max-width: 1024px)');
  function isSwipeLayout() { return swipeMQ.matches; }

  /* Where the visitor is looking, as a fraction of the scene's width. */
  function viewCentre() {
    var v = els.vanity;
    return v.scrollWidth ? (v.scrollLeft + v.clientWidth / 2) / v.scrollWidth : 0.5;
  }
  function setViewCentre(f) {
    var v = els.vanity;
    v.scrollLeft = Math.max(0, f * v.scrollWidth - v.clientWidth / 2);
  }

  /* If a drawer is opened (from the menu or a link) while it is off-screen,
     glide the room so the drawer is visible before it pulls out. */
  function bringDrawerIntoView(id) {
    if (!isSwipeLayout()) return Promise.resolve();
    var btn = D.button(id);
    var r = btn.getBoundingClientRect();
    var vw = els.vanity.clientWidth;
    if (r.left >= 8 && r.right <= vw - 8) return Promise.resolve();
    var target = els.vanity.scrollLeft + (r.left + r.width / 2) - vw / 2;
    if (reduced()) { els.vanity.scrollLeft = target; return Promise.resolve(); }
    els.vanity.scrollTo({ left: target, behavior: 'smooth' });
    // Wait until the glide has actually settled (or 1s at most).
    return new Promise(function (resolve) {
      var start = Date.now(), last = -1, still = 0, done = false;
      var finish = function () { if (!done) { done = true; resolve(); } };
      // Safety net: never wait on animation frames alone (they pause in
      // background tabs and some power-saving modes).
      setTimeout(function () { els.vanity.scrollLeft = target; finish(); }, 1100);
      (function check() {
        if (done) return;
        var x = els.vanity.scrollLeft;
        still = Math.abs(x - last) < 0.5 ? still + 1 : 0;
        last = x;
        if (still >= 3 || Date.now() - start > 1000) finish();
        else requestAnimationFrame(check);
      })();
    });
  }

  function initSwipe() {
    state.swipeCentre = 0.5;    // start on the balanced central view
    var apply = function () { if (isSwipeLayout() && !els.vanity.hidden) setViewCentre(state.swipeCentre); };
    state.applySwipe = apply;
    apply();
    whenImageReady(apply);
    els.vanity.addEventListener('scroll', function () {
      state.lastScroll = Date.now();
      if (isSwipeLayout()) state.swipeCentre = viewCentre();
    }, { passive: true });
    // Keep the same part of the room in view when the screen size changes
    // (Safari's toolbar showing/hiding, rotation).
    var onResize = function () { requestAnimationFrame(apply); };
    window.addEventListener('resize', onResize);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize);
    if (swipeMQ.addEventListener) swipeMQ.addEventListener('change', function () { state.swipeCentre = 0.5; onResize(); });
    // iOS only applies :active styles (drawer press feedback) when a touch listener exists.
    document.addEventListener('touchstart', function () {}, { passive: true });
  }

  function closeSection() {
    if (state.phase !== 'open') return;
    state.phase = 'closing';

    // The drawer starts sliding home while the panel is still folding back
    // into it, so the two motions read as one gesture.
    var pushed = delay(reduced() ? 0 : 280).then(function () {
      return reduced() ? null : D.push(false);
    });

    var concealed = concealPanel().then(function () {
      els.panel.getAnimations().forEach(function (a) { a.cancel(); });
      els.scrim.getAnimations().forEach(function (a) { a.cancel(); });
      els.panelScroll.getAnimations().forEach(function (a) { a.cancel(); });
      els.panelContent.getAnimations().forEach(function (a) { a.cancel(); });
      els.panel.hidden = true;
      els.scrim.hidden = true;
      els.panelContent.innerHTML = '';
      lockPage(false);
      if (state.opener && document.contains(state.opener)) state.opener.focus({ preventScroll: true });
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    });

    Promise.all([pushed, concealed]).then(function () {
      return reduced() ? D.push(true) : null;
    }).then(function () {
      els.stage.classList.remove('is-busy');
      state.phase = 'idle';
      state.sectionId = null;
    });
  }

  /* In-panel navigation: project detail, drawing viewer, back links. */
  function onPanelClick(e) {
    var t = e.target.closest('[data-view]');
    if (!t || !els.panelContent.contains(t) || state.phase !== 'open') return;
    e.preventDefault();
    renderPanel(state.sectionId, t.dataset.view, t.dataset.param);
    els.panelScroll.scrollTop = 0;
    // Pages with their own opening flourish (the coming-soon scroll) play it here too.
    if (AIL.panels && AIL.panels.play) AIL.panels.play(els.panelContent);
    if (!reduced()) {
      els.panelContent.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
        { duration: 360, easing: 'cubic-bezier(.2, .78, .22, 1)' });
    }
    focusPanelHeading();
  }

  /* ---------------------------------------------------------------------
     EXPLORE MENU (touch-friendly list of all nine drawers)
     --------------------------------------------------------------------- */

  function buildMenu() {
    var html = P.drawers.map(function (id, i) {
      return '<li><button type="button" class="explore-menu__item" data-section="' + id + '">' +
        '<span class="explore-menu__num" aria-hidden="true">' + (i + 1) + '</span>' +
        '<span class="explore-menu__label">' + escapeHtml(P.sections[id].label) + '</span>' +
        '<span class="explore-menu__pos">' + D.POSITIONS[i] + '</span>' +
        '<span class="explore-menu__go" aria-hidden="true"></span>' +
        '</button></li>';
    }).join('');
    els.menuList.innerHTML = html;
    // polite announcement when a section is chosen
    var live = document.createElement('p');
    live.className = 'visually-hidden';
    live.setAttribute('aria-live', 'polite');
    live.id = 'explore-status';
    els.menu.querySelector('.explore-menu__sheet').appendChild(live);
    els.menuStatus = live;
  }

  function openMenu() {
    if (state.phase !== 'idle' || state.menuOpen || state.menuClosing) return;
    state.menuOpen = true;
    els.menu.classList.remove('is-closing');
    els.menu.hidden = false;
    lockPage(true);
    var sheet = els.menu.querySelector('.explore-menu__sheet');
    sheet.scrollTop = 0;
    var first = els.menu.querySelector('.explore-menu__item');
    if (first) first.focus({ preventScroll: true });
  }

  /* Slides the sheet away, then unlocks the page. Returns a Promise. */
  function closeMenu(returnFocus) {
    if (!state.menuOpen) return Promise.resolve();
    state.menuOpen = false;
    state.menuClosing = true;
    var finish = function () {
      els.menu.hidden = true;
      els.menu.classList.remove('is-closing');
      els.menu.querySelectorAll('.is-selected').forEach(function (b) {
        b.classList.remove('is-selected');
        b.querySelector('.explore-menu__pos').textContent = D.POSITIONS[P.drawers.indexOf(b.dataset.section)];
      });
      state.menuClosing = false;
      lockPage(false);
      if (returnFocus) els.exploreToggle.focus({ preventScroll: true });
    };
    if (reduced()) { finish(); return Promise.resolve(); }
    els.menu.classList.add('is-closing');
    return delay(220).then(finish);
  }

  /* Tap feedback: the chosen row lights up and says "Opening…", then the
     sheet slides away and that drawer opens. */
  function chooseFromMenu(item) {
    if (state.menuSelecting || !state.menuOpen) return;
    state.menuSelecting = true;
    var id = item.dataset.section;
    item.classList.add('is-selected');
    item.querySelector('.explore-menu__pos').textContent = 'Opening…';
    els.menuStatus.textContent = 'Opening ' + P.sections[id].label;
    delay(reduced() ? 120 : 260).then(function () { return closeMenu(false); }).then(function () {
      state.menuSelecting = false;
      els.menuStatus.textContent = '';
      openSection(id, els.exploreToggle);
    });
  }

  /* ---------------------------------------------------------------------
     LIST VIEW
     --------------------------------------------------------------------- */

  function showList() {
    if (state.phase !== 'idle') return;
    if (state.menuOpen) { els.menu.hidden = true; state.menuOpen = false; lockPage(false); }
    if (els.list.hidden) state.vanityScroll = window.scrollY || 0;
    if (!els.list.dataset.rendered && AIL.panels) {
      els.list.innerHTML = AIL.panels.renderList();
      AIL.panels.enhance(els.list, null, { mode: 'list' });
      els.list.dataset.rendered = '1';
    }
    els.vanity.hidden = true;
    els.list.hidden = false;
    window.scrollTo(0, 0);
    var h = els.list.querySelector('h1');
    if (h) h.focus({ preventScroll: true });
  }

  function hideList() {
    var wasOpen = !els.list.hidden;
    els.list.hidden = true;
    els.vanity.hidden = false;
    if (wasOpen) {
      window.scrollTo(0, state.vanityScroll || 0);
      if (state.applySwipe) state.applySwipe();   // same spot in the room as before
      els.listLink.focus({ preventScroll: true });
    }
  }

  /* ---------------------------------------------------------------------
     ROUTING (#list, or #section-id for a direct link to a drawer)
     --------------------------------------------------------------------- */

  function route() {
    var hash = decodeURIComponent(location.hash.replace(/^#/, ''));
    if (hash === 'list') { showList(); return; }
    var target = hash && els.list.hidden === false ? els.list.querySelector('#list-' + hash) : null;
    if (target) return; // in-page link inside the list view
    hideList();
    if (P.sections[hash] && state.phase === 'idle') {
      whenImageReady(function () { openSection(hash, D.button(hash)); });
    }
  }

  function whenImageReady(fn) {
    if (els.image.complete && els.image.naturalWidth) fn();
    else els.image.addEventListener('load', fn, { once: true });
  }

  /* ---------------------------------------------------------------------
     KEYBOARD: Escape, and keep Tab inside the open dialog
     --------------------------------------------------------------------- */

  function trapTab(e, container) {
    var items = Array.prototype.filter.call(container.querySelectorAll(FOCUSABLE), function (el) {
      return el.offsetParent !== null || el === document.activeElement;
    });
    if (!items.length) { e.preventDefault(); return; }
    var first = items[0], last = items[items.length - 1];
    var active = document.activeElement;
    if (!container.contains(active)) { e.preventDefault(); first.focus(); return; }
    if (e.shiftKey && (active === first || active.id === 'panel-title')) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
  }

  function onKeydown(e) {
    if (e.key === 'Escape') {
      if (state.menuOpen && !state.menuSelecting) { e.preventDefault(); closeMenu(true); return; }
      if (state.phase === 'open') { e.preventDefault(); closeSection(); return; }
    }
    if (e.key === 'Tab') {
      if (state.menuOpen) trapTab(e, els.menu);
      else if (state.phase === 'open') trapTab(e, els.panel);
      else if (state.phase === 'opening' || state.phase === 'closing') e.preventDefault();
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------------------------------------------------------------------
     INIT
     --------------------------------------------------------------------- */

  function init() {
    els.vanity = $('vanity-view');
    els.stage = $('stage');
    els.image = $('vanity-image');
    els.rig = $('drawer-rig');
    els.nav = $('drawers');
    els.hint = $('home-hint');
    els.exploreToggle = $('explore-toggle');
    els.listLink = $('list-link');
    els.menu = $('explore-menu');
    els.menuList = $('explore-list');
    els.scrim = $('scrim');
    els.panel = $('panel');
    els.panelMeta = $('panel-meta');
    els.panelScroll = $('panel-scroll');
    els.panelContent = $('panel-content');
    els.list = $('list-view');

    if (!P || !D) {
      console.error('[An Inside Look] data/portfolio.js or js/drawers.js failed to load.');
      return;
    }

    D.init({
      stage: els.stage, image: els.image, rig: els.rig, nav: els.nav,
      order: P.drawers, sections: P.sections,
      onSelect: function (id, btn) {
        // A swipe across the room should never open a drawer by accident.
        if (isSwipeLayout() && state.lastScroll && Date.now() - state.lastScroll < 120) return;
        openSection(id, btn);
      }
    });

    // Hint beneath the vanity: separate wording for touch screens.
    var touchMQ = swipeMQ;      // phones / tablets held upright get the swipe hint
    var setHint = function () {
      var text = touchMQ.matches && P.site.homeHintMobile ? P.site.homeHintMobile : P.site.homeHint;
      els.hint.textContent = '';
      var span = document.createElement('span');
      span.className = 'home-hint__text';
      span.textContent = text || '';
      els.hint.appendChild(span);
      els.hint.hidden = !text;
    };
    setHint();
    if (touchMQ.addEventListener) touchMQ.addEventListener('change', setHint);
    if (P.site.listLinkText) $('list-link-text').textContent = P.site.listLinkText;
    if (P.site.listLinkLabel) els.listLink.setAttribute('aria-label', P.site.listLinkLabel);
    if (P.site.exploreText) {
      $('explore-text').textContent = P.site.exploreText;
      $('explore-title').textContent = P.site.exploreText;
    }

    buildMenu();

    els.exploreToggle.addEventListener('click', openMenu);
    els.menu.addEventListener('click', function (e) {
      if (state.menuSelecting) return;
      if (e.target === els.menu || e.target.closest('[data-close-menu]')) { closeMenu(true); return; }
      var item = e.target.closest('.explore-menu__item');
      if (item) chooseFromMenu(item);
    });

    els.panel.addEventListener('click', function (e) {
      if (e.target.closest('[data-close-panel]')) { closeSection(); return; }
      onPanelClick(e);
    });
    els.scrim.addEventListener('click', closeSection);

    document.addEventListener('keydown', onKeydown);
    window.addEventListener('hashchange', route);

    // Expose a tiny API (used by tests and the list view).
    AIL.app = {
      open: openSection, close: closeSection,
      phase: function () { return state.phase; },
      openMenu: openMenu, closeMenu: closeMenu
    };

    if (AIL.cursor) AIL.cursor.init();
    initSwipe();
    route();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
