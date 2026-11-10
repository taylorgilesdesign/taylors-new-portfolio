/* ==========================================================================
   PANELS — turns data/portfolio.js into the content inside each drawer
   --------------------------------------------------------------------------
   render(id, ctx)  → HTML for one section (ctx.view selects a sub-view such
                      as a single project or a drawing in the viewer)
   renderList()     → the whole portfolio on one page ("View as a list")
   enhance(el, …)   → wires up interactive bits after rendering
   Missing content is shown as clearly marked placeholders.
   ========================================================================== */
(function () {
  'use strict';

  var P = window.PORTFOLIO;

  /* ---- small helpers -------------------------------------------------- */

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function has(v) {
    if (Array.isArray(v)) return v.some(has);
    return typeof v === 'string' ? v.trim() !== '' : !!v;
  }
  /* Only allow web, email and relative links (never javascript: etc.). */
  function safeUrl(u) {
    u = String(u || '').trim();
    if (!u) return '';
    if (/^(https?:|mailto:)/i.test(u)) return u;
    if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return '';
    return u;
  }
  function safeRatio(r) { return /^[\d.\s\/]+$/.test(r || '') ? r : ''; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function H(level, cls, html, attrs) {
    var l = Math.min(6, Math.max(2, level));
    return '<h' + l + (cls ? ' class="' + cls + '"' : '') + (attrs || '') + '>' + html + '</h' + l + '>';
  }

  function paras(list, firstLede) {
    return (list || []).filter(has).map(function (p, i) {
      return '<p>' + esc(p) + '</p>';   // every paragraph shares one style
    }).join('');
  }

  /* Inline "to confirm" marker for missing text. */
  function tbc(label) {
    return '<span class="tbc"><span class="tbc__tag">To confirm</span>' + esc(label) + '</span>';
  }
  function tbcPara(label) { return '<p class="tbc-para">' + tbc(label) + '</p>'; }

  function placeholder(label, ratio) {
    var r = safeRatio(ratio);
    return '<div class="ph"' + (r ? ' style="--ratio: ' + r + '"' : '') + ' role="img" aria-label="Placeholder: ' + esc(label) + '">' +
      '<span class="ph__tag">Placeholder</span><span class="ph__label">' + esc(label) + '</span></div>';
  }

  function img(item, extraAttrs, eager) {
    return '<img src="' + esc(safeUrl(item.src)) + '" alt="' + esc(item.alt || item.caption || '') + '"' +
      (eager ? '' : ' loading="lazy"') + ' decoding="async"' + (extraAttrs || '') + '>';
  }

  /* A real image wrapped in a button that opens it in the lightbox.
     The image always keeps its own proportions (never cropped). */
  function enlargeable(item, eager) {
    var label = item.alt || item.caption || 'image';
    return '<button type="button" class="zoomable" data-enlarge aria-label="View larger: ' + esc(label) + '">' +
      img(item, '', eager) + '<span class="zoomable__hint" aria-hidden="true"></span></button>';
  }

  /* opts.cls  – extra class on the figure (e.g. 'fig--hero')
     opts.eager – load straight away (for the opening image) */
  function figure(item, opts) {
    opts = opts || {};
    if (!item) return '';
    var cap = has(item.caption) ? '<figcaption>' + esc(item.caption) + '</figcaption>' : '';
    var cls = 'fig' + (opts.cls ? ' ' + opts.cls : '');
    if (has(item.src) && safeUrl(item.src)) return '<figure class="' + cls + '">' + enlargeable(item, opts.eager) + cap + '</figure>';
    return '<figure class="' + cls + ' fig--ph">' + placeholder(item.placeholder || opts.placeholder || 'Image', item.ratio || opts.ratio) + cap + '</figure>';
  }

  function gallery(items, opts) {
    opts = opts || {};
    if (!items || !items.length) return placeholder(opts.placeholder || 'Images', opts.ratio);
    return '<div class="gallery' + (opts.wide ? ' gallery--wide' : '') + '">' +
      items.map(function (it) { return figure(it, opts); }).join('') + '</div>';
  }

  /* Row gallery: large images at their true proportions. A "wide" image fills
     a row; the others pair up. Each image's share of the row equals its
     width/height ratio, so both images in a row end up exactly the same height
     with nothing cropped or stretched. Phones stack them one per row. */
  function ratioNum(r) {
    var m = String(r || '').match(/^\s*([\d.]+)\s*(?:\/\s*([\d.]+))?\s*$/);
    return m ? (+m[1]) / (m[2] ? +m[2] : 1) : 0;
  }
  function rowsReady(items) {
    return (items || []).length > 0 && items.every(function (it) { return has(it.src) && safeUrl(it.src) && ratioNum(it.ratio) > 0; });
  }
  function rowGallery(items, extraCls) {
    var rows = [], pending = [];
    items.forEach(function (it) {
      if (it.wide) { if (pending.length) rows.push(pending); pending = []; rows.push([it]); }
      else { pending.push(it); if (pending.length === 2) { rows.push(pending); pending = []; } }
    });
    if (pending.length) rows.push(pending);
    return '<div class="rows' + (extraCls ? ' ' + extraCls : '') + '">' + rows.map(function (row) {
      return '<div class="rows__row' + (row.length === 1 && !row[0].wide ? ' rows__row--single' : '') + '">' + row.map(function (it) {
        var ar = ratioNum(it.ratio).toFixed(4);
        return figure(it).replace('<figure class="fig"', '<figure class="fig rows__item" style="--ar: ' + ar + '"');
      }).join('') + '</div>';
    }).join('') + '</div>';
  }

  /* Drawings on a project page: each complete drawing full width on a white
     sheet with a brass keyline, at its own proportions; select to enlarge/zoom. */
  function drawingSet(heading, items, lvl, withNote) {
    var real = (items || []).filter(function (it) { return has(it.src) && safeUrl(it.src); });
    if (!real.length) return '';
    return '<div class="block">' + H(lvl + 1, 'h3', esc(heading)) +
      (withNote ? '<p class="note drawing-set__note">Select a drawing to enlarge it and zoom in on details.</p>' : '') +
      '<div class="drawing-set">' + real.map(function (it) {
        // With a ratio, a tall sheet is kept within the screen height (centred).
        var ar = ratioNum(it.ratio);
        var html = figure(it, { cls: 'fig--drawing' });
        return ar ? html.replace('<figure class="fig fig--drawing"', '<figure class="fig fig--drawing" style="--ar: ' + ar.toFixed(4) + '"') : html;
      }).join('') + '</div></div>';
  }

  /* Materials as equal circles (image cropped to fill, never stretched), with
     an optional name centred beneath. Selecting one shows the full image. */
  function materialCircles(items) {
    var real = (items || []).filter(function (it) { return has(it.src) && safeUrl(it.src); });
    return '<div class="mat-circles">' + real.map(function (it) {
      return '<figure class="mat-circle">' + enlargeable(it) +
        (has(it.caption) ? '<figcaption>' + esc(it.caption) + '</figcaption>' : '') + '</figure>';
    }).join('') + '</div>';
  }

  function sectionHead(sec, ctx, extra) {
    var accent = has(sec.accent) ? '<span class="sec-accent" aria-hidden="true">' + esc(sec.accent) + '</span>' : '';
    return '<header class="sec-head">' + accent +
      H(2, 'sec-title', esc(sec.title), ' id="' + ctx.headingId + '" tabindex="-1"') +
      (extra || '') + '<span class="rule" aria-hidden="true"></span></header>';
  }

  function resumeButton() {
    var url = safeUrl(P.site.resume);
    if (url) return '<a class="pill pill--solid" href="' + esc(url) + '" download>Download résumé <span class="visually-hidden">(PDF)</span></a>';
    return '<button type="button" class="pill" disabled>Résumé coming soon</button>';
  }

  function downloadButton(url, label, unavailableLabel) {
    url = safeUrl(url);
    if (url) return '<a class="pill pill--outline" href="' + esc(url) + '" download>' + esc(label) + '</a>';
    return '<button type="button" class="pill" disabled>' + esc(unavailableLabel) + '</button>';
  }

  function backLink(label, view) {
    return '<div class="subnav"><button type="button" class="text-btn" data-view="' + (view || 'index') + '">' +
      '<span aria-hidden="true" class="arrow-left"></span>' + esc(label) + '</button></div>';
  }

  /* ---- 1. Introduction ------------------------------------------------- */

  /* Editorial portrait: cream mat, fine gold keyline, soft shadow, cropped to
     the frame around a configurable focal point (never stretched). */
  function portrait(p) {
    p = p || {};
    var src = has(p.src) ? safeUrl(p.src) : '';
    if (!src) return figure(p, { ratio: '4 / 5' });
    var ratio = safeRatio(p.ratio) || '4 / 5';
    var focus = /^[\d.]+%\s+[\d.]+%$/.test(String(p.focus || '').trim()) ? p.focus.trim() : '50% 30%';
    return '<figure class="portrait">' +
      '<div class="portrait__frame" style="--ratio: ' + ratio + '">' +
        '<img src="' + esc(src) + '" alt="' + esc(p.alt || '') + '" decoding="async" style="object-position: ' + esc(focus) + '">' +
      '</div>' +
      (has(p.caption) ? '<figcaption>' + esc(p.caption) + '</figcaption>' : '') +
    '</figure>';
  }

  function introduction(sec, ctx) {
    var withPhoto = sec.portrait && sec.portrait.show;
    // With a background image: the same blended layout as Design Philosophy and Socials.
    if (!withPhoto && sec.backgroundImage && has(sec.backgroundImage.src)) {
      var blended = blendedLayout(sec, sectionHead(sec, ctx) +
        '<div class="intro-solo"><div>' +
          '<p class="intro-name">' + esc(P.site.name) + '</p>' +
          '<p class="intro-role">' + esc(P.site.role) + '</p>' +
          '<p class="intro-program">' + esc(P.site.program) + '</p>' +
          '<div class="prose">' + (has(sec.paragraphs) ? paras(sec.paragraphs) : tbcPara('Introduction text')) + '</div>' +
          (sec.showResume ? '<div class="actions">' + resumeButton() + '</div>' : '') +
        '</div></div>');
      if (blended) return blended;
    }
    return sectionHead(sec, ctx) +
      '<div class="' + (withPhoto ? 'split' : 'intro-solo') + '">' +
        (withPhoto ? '<div>' + portrait(sec.portrait) + '</div>' : '') +
        '<div>' +
          '<p class="intro-name">' + esc(P.site.name) + '</p>' +
          '<p class="intro-role">' + esc(P.site.role) + '</p>' +
          '<p class="intro-program">' + esc(P.site.program) + '</p>' +
          '<div class="prose">' + (has(sec.paragraphs) ? paras(sec.paragraphs, true) : tbcPara('Introduction text')) + '</div>' +
          (has(sec.skills) ? '<div class="block">' + H(ctx.lvl + 1, 'h3', esc(sec.skillsHeading || 'Software')) +
            '<ul class="tags">' + sec.skills.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>' +
          '</div>' : '') +
          (sec.showResume ? '<div class="actions">' + resumeButton() + '</div>' : '') +
        '</div>' +
      '</div>';
  }

  /* ---- 2. Projects ----------------------------------------------------- */

  /* Projects overview: an editorial column of projects. Each row is one link:
     a large cover image whose edges feather into the page, beside its title,
     description and "View project". Image sides alternate left / right.
     A project's cover.focus ("x% y%") chooses which part stays in frame. */
  function projectCards(sec, ctx) { return editorialRows(sec.items, ctx, 'project', 'list-project-'); }

  /* Shared by Projects and Competitions. view = the detail view each row opens;
     listPrefix = the anchor of that item's detail in the "A Look Within" list. */
  function editorialRows(items, ctx, view, listPrefix) {
    return '<div class="proj-list">' + items.map(function (p, i) {
      var c = p.cover || {};
      var hasImg = has(c.src) && safeUrl(c.src);
      var focus = /^[\d.]+%\s+[\d.]+%$/.test(String(c.focus || '').trim()) ? c.focus.trim() : '50% 50%';
      // No cover yet: show p.coverText (e.g. "Coming Soon") in calligraphy, or a placeholder label.
      var media = hasImg
        ? '<img src="' + esc(safeUrl(c.src)) + '" alt="' + esc(c.alt || '') + '" loading="lazy" decoding="async" style="object-position: ' + esc(focus) + '">'
        : has(p.coverText)
          ? '<span class="proj__script">' + esc(p.coverText) + '</span>'
          : '<span class="proj__ph" role="img" aria-label="Placeholder: cover image"><span class="ph__tag">Placeholder</span><span class="ph__label">' + esc(c.placeholder || 'Cover image') + '</span></span>';
      var href = ctx.mode === 'list' ? '#' + listPrefix + p.id : '#';
      var attrs = ctx.mode === 'list' ? ' data-jump="' + listPrefix + esc(p.id) + '"' : ' data-view="' + view + '" data-param="' + esc(p.id) + '"';
      return '<a class="proj' + (i % 2 ? ' proj--flip' : '') + '" href="' + href + '"' + attrs + '>' +
        '<span class="proj__media' + (hasImg ? '' : has(p.coverText) ? ' proj__media--text' : ' proj__media--empty') + '">' + media + '</span>' +
        '<span class="proj__text">' +
          '<span class="proj__num">' + pad(i + 1) + '</span>' +
          '<span class="proj__title">' + esc(p.title) + '</span>' +
          // Set  showTypeOnCard: false  on a project to hide this subtitle.
          (has(p.projectType) && p.showTypeOnCard !== false ? '<span class="proj__type">' + esc(p.projectType) + '</span>' : '') +
          (has(p.rowNote) ? '<span class="proj__type">' + esc(p.rowNote) + '</span>' : '') +
          '<span class="proj__summary">' + esc(p.summary) + '</span>' +
          '<span class="proj__more">' + (ctx.mode === 'list' ? 'Read more' : 'View project') + '</span>' +
        '</span></a>';
    }).join('') + '</div>';
  }

  function projectDetail(p, i, total, ctx, lvl) {
    // Materials always use the same equal circles (see materialCircles) so every
    // project matches, whether it has photos yet or placeholders.
    var mats = (p.materials || []);
    var matsHtml = mats.length ? '<div class="mat-circles">' + mats.map(function (m) {
      var face = has(m.src) && safeUrl(m.src) ? enlargeable({ src: m.src, alt: m.name || 'Material sample' }) : placeholder(m.placeholder || 'Material', '1');
      return '<figure class="mat-circle">' + face +
        (has(m.name) ? '<figcaption class="mat-circle__name">' + esc(m.name) + '</figcaption>' : '') +
        (has(m.note) ? '<p class="mat-circle__note">' + esc(m.note) + '</p>' : '') + '</figure>';
    }).join('') + '</div>' : placeholder('Materials');

    var titleAttrs = ctx.mode === 'panel' ? ' id="' + ctx.headingId + '" tabindex="-1"' : ' id="list-project-' + esc(p.id) + '" tabindex="-1"';
    var next = P.sections.projects.items[(i + 1) % total];
    // With a real cover image, it opens the project full width under the title;
    // until then, a placeholder sits beside the overview as before.
    var hasCover = !!(p.cover && has(p.cover.src) && safeUrl(p.cover.src));

    return (ctx.mode === 'panel' ? backLink('All projects') : '') +
      '<article class="project-detail" data-lightbox-group>' +
      '<header class="sec-head">' +
        '<p class="eyebrow">Project ' + pad(i + 1) + ' of ' + pad(total) + '</p>' +
        H(lvl, 'sec-title is-name', esc(p.title), titleAttrs) +
        '<span class="rule" aria-hidden="true"></span>' +
      '</header>' +
      // Every project opens the same way: cover image (or its placeholder) full
      // width, then the Overview at the same width as Design intent.
      (hasCover ? figure(p.cover, { cls: 'fig--hero', eager: ctx.mode === 'panel' })
                : figure({ placeholder: (p.cover && p.cover.placeholder) || 'Cover image' }, { cls: 'fig--hero', ratio: '16 / 9' })) +
      // Project type / My role row. Set  showFacts: false  on a project to hide it.
      (p.showFacts === false ? '' :
        '<dl class="facts">' +
          '<div><dt>Project type</dt><dd>' + (has(p.projectType) ? esc(p.projectType) : tbc('Academic or professional classification')) + '</dd></div>' +
          '<div><dt>My role</dt><dd>' + (has(p.role) ? esc(p.role) : tbc('Your role on this project')) + '</dd></div>' +
        '</dl>') +
      '<div class="block prose">' + H(lvl + 1, 'h3', 'Overview') + paras(p.overview) + '</div>' +
      // Shown only once there is text for it.
      (has(p.designIntent) ? '<div class="block prose">' + H(lvl + 1, 'h3', 'Design intent') + paras(p.designIntent) + '</div>' : '') +
      // Leave "concept" out of a project in portfolio.js to hide this section.
      (Array.isArray(p.concept) ? '<div class="block">' + H(lvl + 1, 'h3', 'Concept imagery') + gallery(p.concept, { placeholder: 'Concept image' }) + '</div>' : '') +
      // With materialImages, a "Materials" section appears after the drawings instead.
      (Array.isArray(p.materialImages) ? '' : '<div class="block">' + H(lvl + 1, 'h3', 'Materials') + matsHtml + '</div>') +
      // Projects with floorPlans / elevations get dedicated sections;
      // others keep the combined "Plans and elevations" placeholder block.
      (Array.isArray(p.floorPlans) || Array.isArray(p.elevations)
        ? drawingSet('Floor plans', p.floorPlans, lvl, true) + drawingSet('Elevation', p.elevations, lvl, !has(p.floorPlans))
        : '<div class="block">' + H(lvl + 1, 'h3', 'Plans and elevations') + gallery(p.plans, { wide: true, placeholder: 'Plan or elevation' }) + '</div>') +
      // Optional key plan and mood board (each appears only when it has an image).
      drawingSet('Key plan', p.keyPlans, lvl, false) +
      drawingSet('Mood board', p.moodBoard, lvl, false) +
      (Array.isArray(p.materialImages) && has(p.materialImages.map(function (m) { return m.src; }))
        ? '<div class="block">' + H(lvl + 1, 'h3', 'Materials') + materialCircles(p.materialImages) + '</div>'
        : '') +
      '<div class="block">' + H(lvl + 1, 'h3', 'Renderings') +
        (rowsReady(p.renderings) ? rowGallery(p.renderings) : gallery(p.renderings, { wide: true, placeholder: 'Rendering', ratio: '16 / 10' })) + '</div>' +
      '<div class="actions">' + downloadButton(p.pdf, 'Download project PDF', 'Project PDF not yet available') +
        (ctx.mode === 'panel' && total > 1 ? '<button type="button" class="pill pill--outline" data-view="project" data-param="' + esc(next.id) + '">Next: ' + esc(next.title) + '</button>' : '') +
      '</div>' +
      '</article>';
  }

  /* A project still in progress (has comingSoonPage) opens the same scroll as
     the Thesis drawer instead of a full project page. */
  function projectPage(p, i, total, ctx, lvl) {
    if (p.comingSoonPage) {
      if (ctx.mode === 'panel') return backLink('All projects') + comingSoonScroll(p.comingSoonPage, Object.assign({}, ctx, { lvl: lvl }));
      return '<div class="list-soon" id="list-project-' + esc(p.id) + '" tabindex="-1">' +
        comingSoonScroll(p.comingSoonPage, Object.assign({}, ctx, { lvl: lvl, headingId: 'list-soon-' + p.id })) + '</div>';
    }
    return projectDetail(p, i, total, ctx, lvl);
  }

  function projects(sec, ctx) {
    if (ctx.mode === 'panel' && ctx.view === 'project') {
      var i = sec.items.findIndex(function (p) { return p.id === ctx.param; });
      if (i > -1) return projectPage(sec.items[i], i, sec.items.length, ctx, 2);
    }
    var html = sectionHead(sec, ctx) + (has(sec.intro) ? '<div class="prose block"><p>' + esc(sec.intro) + '</p></div>' : '') + projectCards(sec, ctx);
    if (ctx.mode === 'list') {
      html += sec.items.map(function (p, i) { return projectPage(p, i, sec.items.length, ctx, 3); }).join('');
    }
    return html;
  }

  /* ---- 3. Design philosophy ------------------------------------------- */

  /* Shared layout: content on the left, a photo softly blended into the page
     on the right (decorative, so screen readers skip it). Used by any section
     with a backgroundImage in portfolio.js. Returns '' if there is no image. */
  function blendedLayout(sec, innerHtml) {
    var bg = sec.backgroundImage || {};
    var bgSrc = has(bg.src) ? safeUrl(bg.src) : '';
    if (!bgSrc) return '';
    var okFocus = function (f, d) { return /^[\d.]+%\s+[\d.]+%$/.test(String(f || '').trim()) ? f.trim() : d; };
    var dim = typeof bg.dim === 'number' && bg.dim >= 0 && bg.dim <= 1 ? '; --dim: ' + bg.dim : '';
    return '<div class="philo" style="--focus: ' + okFocus(bg.focus, '50% 50%') + '; --focus-mobile: ' + okFocus(bg.focusMobile || bg.focus, '50% 50%') + dim + '">' +
      '<div class="philo__media" aria-hidden="true"><img src="' + esc(bgSrc) + '" alt="" decoding="async"></div>' +
      '<div class="philo__text">' + innerHtml + '</div>' +
    '</div>';
  }

  function philosophy(sec, ctx) {
    var blended = blendedLayout(sec, sectionHead(sec, ctx) +
      '<div class="prose">' + (has(sec.paragraphs) ? paras(sec.paragraphs) : tbcPara('Design philosophy')) + '</div>');
    if (blended) return blended;
    return sectionHead(sec, ctx) +
      '<div class="split split--reverse">' +
        '<div class="prose">' + (has(sec.paragraphs) ? paras(sec.paragraphs, true) : tbcPara('Design philosophy')) + '</div>' +
        '<div class="gallery" style="grid-template-columns: 1fr">' + (sec.images || []).map(function (it) { return figure(it, { ratio: '4 / 3' }); }).join('') + '</div>' +
      '</div>';
  }

  /* ---- 4. Technical drawings ------------------------------------------ */

  function drawingTitle(d) { return has(d.title) ? d.title : (d.placeholder || 'Drawing'); }

  function drawingsIndex(sec, ctx) {
    var anyReal = sec.categories.some(function (c) { return c.items.some(function (d) { return has(d.image); }); });
    var html = sectionHead(sec, ctx) +
      (has(sec.intro) ? '<div class="prose"><p>' + esc(sec.intro) + '</p></div>' : '') +
      (anyReal ? '<p class="note">Select a drawing to view it full size and zoom in.</p>' : '<p class="notice">Drawings will be added here. The tiles below are placeholders only.</p>');
    sec.categories.forEach(function (cat, ci) {
      html += '<div class="block">' + H(ctx.lvl + 1, 'h3', esc(cat.label)) + '<div class="gallery">';
      cat.items.forEach(function (d, ii) {
        var title = drawingTitle(d);
        if (has(d.image) && safeUrl(d.image)) {
          var inner = img({ src: d.image, alt: title }) +
            '<span class="drawing-tile__title">' + esc(title) + '</span>' +
            (has(d.project) ? '<span class="drawing-tile__sub">' + esc(d.project) + '</span>' : '');
          html += ctx.mode === 'list'
            ? '<a class="drawing-tile" href="' + esc(safeUrl(d.image)) + '" target="_blank" rel="noopener">' + inner + '<span class="visually-hidden"> (opens full size in a new tab)</span></a>'
            : '<button type="button" class="drawing-tile" data-view="drawing" data-param="' + ci + ':' + ii + '">' + inner + '<span class="visually-hidden"> — view full size</span></button>';
        } else {
          html += figure({ placeholder: d.placeholder || cat.label, caption: d.caption }, { ratio: '4 / 3' });
        }
      });
      html += '</div></div>';
    });
    return html;
  }

  function drawingViewer(sec, ctx) {
    var parts = String(ctx.param || '').split(':');
    var cat = sec.categories[+parts[0]];
    var d = cat && cat.items[+parts[1]];
    if (!d || !has(d.image)) return drawingsIndex(sec, Object.assign({}, ctx, { view: 'index' }));
    var src = esc(safeUrl(d.image));
    return backLink('All drawings') +
      '<header class="sec-head"><p class="eyebrow">' + esc(cat.label) + (has(d.project) ? ' · ' + esc(d.project) : '') + '</p>' +
        H(2, 'sec-title is-name', esc(drawingTitle(d)), ' id="' + ctx.headingId + '" tabindex="-1"') + '</header>' +
      '<div class="viewer" data-viewer>' +
        '<div class="viewer__toolbar" role="toolbar" aria-label="Drawing zoom">' +
          '<button type="button" class="icon-btn" data-zoom="out" aria-label="Zoom out">−</button>' +
          '<span class="viewer__zoom" data-zoom-label aria-live="polite">Fit</span>' +
          '<button type="button" class="icon-btn" data-zoom="in" aria-label="Zoom in">+</button>' +
          '<button type="button" class="pill pill--outline" data-zoom="fit">Fit</button>' +
          '<button type="button" class="pill pill--outline" data-zoom="actual">100%</button>' +
          '<a class="pill pill--outline" href="' + src + '" target="_blank" rel="noopener">Open full size</a>' +
          (has(d.pdf) && safeUrl(d.pdf) ? '<a class="pill pill--solid" href="' + esc(safeUrl(d.pdf)) + '" download>Download PDF</a>' : '') +
        '</div>' +
        '<div class="viewer__canvas is-fit" data-canvas tabindex="0" aria-label="Drawing. Use plus and minus keys to zoom; drag or scroll to move around.">' +
          '<img src="' + src + '" alt="' + esc(drawingTitle(d)) + '" decoding="async">' +
        '</div>' +
        (has(d.caption) ? '<p class="note">' + esc(d.caption) + '</p>' : '') +
      '</div>';
  }

  /* The whole drawer: the working-drawing set as a turnable, zoomable stack of
     sheets (js/drawingset.js). In the "A Look Within" list it is a simple
     column of sheets instead. */
  function sheetLabel(s) { return [s.number, s.name].filter(has).join(' · '); }

  function technicalDrawingSet(sec, ctx) {
    var set = sec.set;
    var sheets = (set.sheets || []).filter(function (s) { return has(s.image) && safeUrl(s.image); });
    var pdf = safeUrl(set.pdf);
    var pdfName = String(set.pdf || '').split('/').pop();
    if (ctx.mode === 'list') {
      return sectionHead(sec, ctx) +
        (has(set.title) ? '<p class="eyebrow">' + esc(set.title) + (has(set.subtitle) ? ' · ' + esc(set.subtitle) : '') + '</p>' : '') +
        '<div class="drawing-set">' + sheets.map(function (s) {
          return figure({ src: s.image, alt: sheetLabel(s) + ' — ' + (set.title || 'drawing sheet'), caption: sheetLabel(s) }, { cls: 'fig--drawing' });
        }).join('') + '</div>' +
        (pdf ? '<div class="actions"><a class="pill pill--outline" href="' + esc(pdf) + '" download="' + esc(pdfName) + '">Download the drawing set <span class="visually-hidden">(PDF)</span></a></div>' : '');
    }
    var data = sheets.map(function (s) {
      return { image: safeUrl(s.image), hd: safeUrl(s.hd || s.image), number: s.number || '', name: s.name || '' };
    });
    var chev = function (d) { return '<span class="dset__chev dset__chev--' + d + '" aria-hidden="true"></span>'; };
    var glass = '<svg class="dset__icon" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><circle cx="8.5" cy="8.5" r="5.5"/><path d="M12.6 12.6 17 17M8.5 6v5M6 8.5h5"/></g></svg>';
    var down = '<svg class="dset__icon" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3v10M5.5 8.8 10 13.3l4.5-4.5M4 16.5h12"/></g></svg>';
    return '<section class="dset" data-dset="' + esc(JSON.stringify(data)) + '" data-native-cursor>' +
      '<div class="dset__frame">' +
        // The same cursive drawer title as every other drawer page.
        sectionHead(sec, ctx) +
        '<div class="dset__head">' +
          '<p class="dset__title">' + (has(set.title) ? esc(set.title) : '') +
            (has(set.subtitle) ? ' <span class="dset__project">· ' + esc(set.subtitle) + '</span>' : '') + '</p>' +
          '<p class="dset__sheet" data-dset-name>' + esc(sheets[0] ? sheetLabel(sheets[0]) : '') + '</p>' +
        '</div>' +
        '<div class="dset__desk">' +
          '<div class="dset__stage" data-dset-stage tabindex="0" role="img" aria-roledescription="drawing set">' +
            '<canvas class="dset__canvas" aria-hidden="true"></canvas>' +
            '<div class="dset__zoom" data-dset-zoom tabindex="0" role="img" aria-label="Zoomed sheet" hidden><img alt="" draggable="false"></div>' +
          '</div>' +
          '<p class="dset__hint" data-dset-hint aria-hidden="true"><span class="dset__hint-curl"></span><span class="dset__hint-text">Turn the sheet</span></p>' +
        '</div>' +
        '<div class="dset__bar">' +
          '<div class="dset__group dset__group--nav">' +
            '<button type="button" class="icon-btn dset__btn" data-act="prev" aria-label="Previous sheet">' + chev('l') + '</button>' +
            '<span class="dset__count" data-dset-count></span>' +
            '<button type="button" class="icon-btn dset__btn" data-act="next" aria-label="Next sheet">' + chev('r') + '</button>' +
          '</div>' +
          '<div class="dset__group dset__group--zoom">' +
            '<button type="button" class="icon-btn dset__btn" data-act="out" aria-label="Zoom out"><span aria-hidden="true">−</span></button>' +
            '<span class="dset__count" data-dset-zoomlabel aria-live="polite">100%</span>' +
            '<button type="button" class="icon-btn dset__btn" data-act="in" aria-label="Zoom in"><span aria-hidden="true">+</span></button>' +
            '<button type="button" class="text-btn dset__link" data-act="fit">Fit</button>' +
          '</div>' +
          '<div class="dset__group dset__group--actions">' +
            '<button type="button" class="text-btn dset__link dset__inspect" data-act="inspect">' + glass + 'Zoom</button>' +
            '<button type="button" class="text-btn dset__link dset__back" data-act="close"><span aria-hidden="true" class="arrow-left"></span>Back to the sheets</button>' +
            (pdf ? '<a class="text-btn dset__link dset__dl" href="' + esc(pdf) + '" download="' + esc(pdfName) + '">' + down + 'PDF<span class="visually-hidden"> — download the original drawing set</span></a>' : '') +
          '</div>' +
        '</div>' +
        '<p class="visually-hidden" aria-live="polite" data-dset-live></p>' +
      '</div>' +
    '</section>';
  }

  function drawings(sec, ctx) {
    if (sec.set && (sec.set.sheets || []).some(function (s) { return has(s.image); })) return technicalDrawingSet(sec, ctx);
    if (ctx.mode === 'panel' && ctx.view === 'drawing') return drawingViewer(sec, ctx);
    return drawingsIndex(sec, ctx);
  }

  /* ---- 5. Thesis ------------------------------------------------------- */

  /* Coming-soon presentation, used while sec.comingSoon.enabled is true.
     The full thesis renderer below is kept intact for when it's ready.

     A rolled letter on soft cotton paper: deckled (torn) side edges, paper
     rolls whose ends show the spiral of layers, tied with jute twine and a
     bronze wax seal with a laurel wreath — after the inspiration images. */

  // Torn side edges, the same every time (no randomness between renders).
  function deckle() {
    var n = 46, left = [], right = [], i, y, j;
    var jag = function (k, s) { return (Math.sin(k * 12.9898 + s) * 43758.5453) % 1; };
    for (i = 0; i <= n; i++) {
      y = (i / n * 100).toFixed(2);
      j = Math.abs(jag(i, 1.7));
      left.push((0.25 + j * 1.25).toFixed(2) + '% ' + y + '%');
      j = Math.abs(jag(i, 4.3));
      right.push((99.75 - j * 1.25).toFixed(2) + '% ' + (100 - i / n * 100).toFixed(2) + '%');
    }
    return 'polygon(' + left.concat(right).join(', ') + ')';
  }

  // Bronze wax seal with an embossed laurel wreath, hung from jute twine.
  function waxSeal() {
    // laurel wreath: two arcs of small leaves around the centre, open at the top
    var leaves = '', cx = 50, cy = 46, r = 12.5;
    [[118, 250], [-70, 62]].forEach(function (arc) {
      for (var k = 0; k < 6; k++) {
        var deg = arc[0] + (arc[1] - arc[0]) * k / 5, a = deg * Math.PI / 180;
        var x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
        leaves += '<ellipse cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" rx="1.5" ry="3.4" transform="rotate(' + deg.toFixed(0) + ' ' + x.toFixed(1) + ' ' + y.toFixed(1) + ')"/>';
      }
    });
    return '<svg class="scroll__tie" viewBox="0 0 100 124" aria-hidden="true" focusable="false">' +
      '<defs>' +
        '<radialGradient id="wax" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#d2a670"/><stop offset=".4" stop-color="#a5723e"/><stop offset=".8" stop-color="#744a23"/><stop offset="1" stop-color="#553418"/></radialGradient>' +
        '<radialGradient id="waxIn" cx="60%" cy="65%" r="70%"><stop offset="0" stop-color="#946232"/><stop offset="1" stop-color="#b8854e"/></radialGradient>' +
      '</defs>' +
      // jute twine: two strands around the roll, gathering down to the seal
      '<g fill="none" stroke-linecap="round">' +
        '<path d="M42 0 C42 10 43 20 46 31 C47 36 47 42 47 48 M52 0 C52 11 51 21 49 31 C48 36 48 42 48 48" stroke="#a48b67" stroke-width="2.3"/>' +
        '<path d="M42 0 C42 10 43 20 46 31 C47 36 47 42 47 48 M52 0 C52 11 51 21 49 31 C48 36 48 42 48 48" stroke="#ddcba8" stroke-width=".9" stroke-dasharray="1.8 2.4"/>' +
        '<path d="M44 33 C46 31 50 31 52 34" stroke="#a48b67" stroke-width="2"/>' +
      '</g>' +
      // the seal: an irregular disc of wax with a pressed laurel wreath
      '<path d="M48 26c8-.6 15 2 19.6 7.4 5 5.9 6 14.6 2.7 21.8-3.4 7.6-11 12.6-19.6 13-9.3.5-17.7-4-21.4-11.2-3.7-7.3-2.6-16.4 2.7-22.4 4.2-4.8 9.7-8.2 16-8.6z" fill="url(#wax)"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="16.5" fill="url(#waxIn)"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="16.5" fill="none" stroke="#5a3818" stroke-width=".7" opacity=".7"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="17.6" fill="none" stroke="#e2bb86" stroke-width=".6" opacity=".35"/>' +
      '<g fill="#5c3a19" opacity=".72">' + leaves + '</g>' +
      '<path d="M46.5 58.5 L50 56 L53.5 58.5" stroke="#5c3a19" stroke-width="1" fill="none" opacity=".6" stroke-linecap="round"/>' +
      '<ellipse cx="41" cy="34" rx="7.5" ry="3" fill="#f6dcb3" opacity=".22" transform="rotate(-28 41 34)"/>' +
      '</svg>';
  }

  function thesisComingSoon(sec, ctx) { return comingSoonScroll(sec.comingSoon, ctx); }

  /* The rolled-letter "coming soon" scroll. Shared by the Thesis drawer and
     any competition entry with a comingSoonPage (e.g. Cairvia). cs lines:
     eyebrow, line (calligraphy), heading, projectTitle (calligraphy),
     projectSubtitle (serif), status — any can be left out. */
  function comingSoonScroll(cs, ctx) {
    var lvl = ctx.lvl || 2;
    // Paper rolls above and below (they travel apart as the letter unrolls, see playScroll()).
    // The twine and wax seal sit on the lower roll, so they travel with it.
    var roll = function (pos) {
      return '<div class="scroll__roll scroll__roll--' + pos + '" aria-hidden="true"><span class="scroll__grain"></span>' +
        (pos === 'bottom' ? waxSeal() : '') + '</div>';
    };
    return '<div class="scroll" data-scroll>' + roll('top') +
      '<section class="soon scroll__paper" aria-labelledby="' + ctx.headingId + '">' +
        '<div class="scroll__sheet" style="clip-path: ' + deckle() + '">' +
          '<div class="soon__inner">' +
            (has(cs.eyebrow) ? '<p class="soon__eyebrow" aria-hidden="true">' + esc(cs.eyebrow) + '</p>' : '') +
            (has(cs.line) ? '<p class="soon__line">' + esc(cs.line) + '</p>' : '') +
            H(lvl, 'soon__heading', (has(cs.eyebrow) ? '<span class="visually-hidden">' + esc(cs.eyebrow) + ': </span>' : '') + esc(cs.heading), ' id="' + ctx.headingId + '" tabindex="-1"') +
            '<span class="soon__ornament" aria-hidden="true"></span>' +
            (has(cs.projectTitle) ? H(lvl + 1, 'soon__title', esc(cs.projectTitle)) : '') +
            (has(cs.projectSubtitle) ? '<p class="soon__subtitle">' + esc(cs.projectSubtitle) + '</p>' : '') +
            (has(cs.status) ? '<p class="soon__status">' + esc(cs.status) + '</p>' : '') +
          '</div>' +
        '</div>' +
      '</section>' + roll('bottom') + '</div>';
  }

  /* ---- Royal scroll unfurling ------------------------------------------
     The parchment is revealed (clipped, never stretched) between two rolls
     that travel apart; the rolls slim down as paper leaves them, their grain
     turns, and both settle with a gentle overshoot. ~2 seconds in total. */
  var SCROLL_MS = 1750, SCROLL_DELAY = 260;

  function prepareScroll(root) {
    // Panel only (not the list view), and only with motion allowed.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    root.querySelectorAll('[data-scroll]').forEach(function (s) { s.classList.add('is-rolled'); });
  }

  function playScroll(root) {
    var s = root.querySelector('[data-scroll].is-rolled');
    if (!s) return;
    var paper = s.querySelector('.scroll__paper');
    var top = s.querySelector('.scroll__roll--top'), bottom = s.querySelector('.scroll__roll--bottom');
    var H = paper.offsetHeight;
    // Open from the middle of what's on screen (on a phone the scroll is
    // taller than the screen, so it opens near the top where people look).
    var scroller = s.closest('.panel__scroll');
    var visible = scroller ? Math.max(120, scroller.clientHeight - (paper.getBoundingClientRect().top - scroller.getBoundingClientRect().top)) : H;
    var y0 = Math.round(Math.min(H / 2, visible / 2));
    var easing = 'cubic-bezier(.42, .02, .24, 1)';
    var opts = { duration: SCROLL_MS, delay: SCROLL_DELAY, easing: easing, fill: 'backwards' };
    s.classList.remove('is-rolled');
    var anims = [
      paper.animate([
        { clipPath: 'inset(' + y0 + 'px 0 ' + (H - y0) + 'px 0)' },
        { clipPath: 'inset(0px 0 0px 0)', offset: .88 },
        { clipPath: 'inset(0px 0 0px 0)' }
      ], opts),
      top.animate([
        { transform: 'translateY(' + y0 + 'px) scaleY(1.22)' },
        { transform: 'translateY(-5px) scaleY(1)', offset: .88 },
        { transform: 'translateY(0) scaleY(1)' }
      ], opts),
      bottom.animate([
        { transform: 'translateY(' + (y0 - H) + 'px) scaleY(1.22)' },
        { transform: 'translateY(5px) scaleY(1)', offset: .88 },
        { transform: 'translateY(0) scaleY(1)' }
      ], opts),
      // the rolls' grain turns as paper comes off them
      top.querySelector('.scroll__grain').animate([{ backgroundPosition: '0 0' }, { backgroundPosition: '0 -' + Math.round(y0 / 3) + 'px' }], opts),
      bottom.querySelector('.scroll__grain').animate([{ backgroundPosition: '0 0' }, { backgroundPosition: '0 ' + Math.round((H - y0) / 3) + 'px' }], opts),
      // the closed scroll eases into view before it opens
      s.animate([{ opacity: 0, transform: 'translateY(10px) scale(.985)' }, { opacity: 1, transform: 'none' }],
        { duration: 380, easing: 'ease-out', fill: 'backwards' })
    ];
    Promise.all(anims.map(function (a) { return a.finished.catch(function () {}); })).then(function () {
      anims.forEach(function (a) { a.cancel(); });
    });
  }

  function thesis(sec, ctx) {
    if (sec.comingSoon && sec.comingSoon.enabled) return thesisComingSoon(sec, ctx);
    var extra = (has(sec.subtitle) ? '<p class="sec-sub">' + esc(sec.subtitle) + '</p>' : '') +
      (has(sec.status) ? '<p class="status">' + esc(sec.status) + '</p>' : '');
    var html = sectionHead(sec, ctx, extra) +
      '<div class="prose">' + paras(sec.summary, true) + '</div>' +
      (has(sec.themes) ? '<ul class="chips" aria-label="Themes">' + sec.themes.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '') +
      '<div class="chapters block">';
    (sec.chapters || []).forEach(function (ch) {
      html += '<section class="chapter"><div><span class="chapter__num" aria-hidden="true"></span>' + H(ctx.lvl + 1, 'h3', esc(ch.heading)) + '</div><div class="prose">';
      html += has(ch.paragraphs) ? paras(ch.paragraphs) : '';
      if (has(ch.list)) html += '<ul class="chips">' + ch.list.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>';
      if (!has(ch.paragraphs)) html += tbcPara(ch.placeholder || ch.heading);
      if ('citations' in ch) {
        html += has(ch.citations)
          ? '<ol class="note">' + ch.citations.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ol>'
          : tbcPara('Research citations');
      }
      if (ch.images) html += '<div class="block">' + gallery(ch.images, { ratio: '4 / 3' }) + '</div>';
      html += '</div></section>';
    });
    return html + '</div>';
  }

  /* ---- 6. Competitions ------------------------------------------------- */

  /* Overview: one editorial row per entry (same as Projects). Each row opens
     the entry's own page. Sections without content are left out of a page;
     sketches / renderings appear as soon as real images are added. */
  function competitionDetail(c, i, total, ctx, lvl) {
    // Entries still in development open the same scroll as the Thesis drawer.
    if (c.comingSoonPage && ctx.mode === 'panel') {
      return backLink('All competitions') + comingSoonScroll(c.comingSoonPage, Object.assign({}, ctx, { lvl: lvl }));
    }
    var titleAttrs = ctx.mode === 'panel' ? ' id="' + ctx.headingId + '" tabindex="-1"' : ' id="list-comp-' + esc(c.id) + '" tabindex="-1"';
    var items = P.sections.competitions.items, next = items[(i + 1) % total];
    var hasCover = !!(c.cover && has(c.cover.src) && safeUrl(c.cover.src));
    var realImgs = function (list) { return (list || []).filter(function (it) { return has(it.src) && safeUrl(it.src); }); };
    var boards = realImgs(c.boards), sketches = realImgs(c.sketches), renders = realImgs(c.renderings);
    var block = function (title, body) { return '<div class="block">' + H(lvl + 1, 'h3', title) + body + '</div>'; };
    return (ctx.mode === 'panel' ? backLink('All competitions') : '') +
      '<article class="project-detail entry-detail" data-lightbox-group>' +
      '<header class="sec-head">' +
        '<p class="eyebrow">' + esc(c.kind || ('Entry ' + pad(i + 1) + ' of ' + pad(total))) + '</p>' +
        H(lvl, 'sec-title is-name', esc(c.title), titleAttrs) +
        (has(c.tagline) ? '<p class="entry-detail__tagline">' + esc(c.tagline) + '</p>' : '') +
        (has(c.comingSoon) ? '<div class="entry__soon"><p class="entry__soon-label">' + esc(c.comingSoon) + '</p>' +
          (has(c.comingSoonNote) ? '<p class="entry__soon-note">' + esc(c.comingSoonNote) + '</p>' : '') + '</div>' : '') +
        (has(c.competition) ? '<p class="note">' + esc(c.competition) + '</p>' : '') +
        '<span class="rule" aria-hidden="true"></span>' +
      '</header>' +
      (hasCover ? figure(c.cover, { cls: 'fig--hero fig--blend', eager: ctx.mode === 'panel' }) : '') +
      (has(c.concept) ? '<div class="block prose">' + H(lvl + 1, 'h3', 'Concept and inspiration') + paras(c.concept) + '</div>' : '') +
      (has(c.brief) ? '<div class="block prose">' + H(lvl + 1, 'h3', 'Design brief') + paras(c.brief) + '</div>' : '') +
      (has(c.features) ? block('Key features', '<ul class="list-elegant">' + c.features.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('') + '</ul>') : '') +
      (boards.length ? block('Presentation boards',
        '<p class="note drawing-set__note">Select a board to enlarge it and zoom in on details.</p>' +
        '<div class="gallery gallery--boards">' + boards.map(function (b) { return figure(b); }).join('') + '</div>') : '') +
      (sketches.length || !boards.length ? block('Development sketches', gallery(sketches.length ? sketches : c.sketches, { ratio: '4 / 3' })) : '') +
      (renders.length || !boards.length ? block('Product renderings', gallery(renders.length ? renders : c.renderings, { ratio: '4 / 3' })) : '') +
      (has(c.future) ? '<div class="block prose">' + H(lvl + 1, 'h3', 'Future development') + paras(c.future) + '</div>' : '') +
      (ctx.mode === 'panel' && total > 1 ? '<div class="actions"><button type="button" class="pill pill--outline" data-view="entry" data-param="' + esc(next.id) + '">Next: ' + esc(next.title) + '</button></div>' : '') +
      '</article>';
  }

  function competitions(sec, ctx) {
    if (ctx.mode === 'panel' && ctx.view === 'entry') {
      var i = sec.items.findIndex(function (c) { return c.id === ctx.param; });
      if (i > -1) return competitionDetail(sec.items[i], i, sec.items.length, ctx, 2);
    }
    // the row text: a short summary, or the first concept paragraph
    var rows = sec.items.map(function (c) {
      return Object.assign({}, c, {
        summary: has(c.summary) ? c.summary : ((c.concept || []).filter(has)[0] || ''),
        projectType: c.kind, showTypeOnCard: true,
        rowNote: has(c.comingSoon) ? c.comingSoon : '',
        // in place of a missing cover: "Coming Soon" in calligraphy
        coverText: has(c.comingSoon) ? c.comingSoon : ''
      });
    });
    var html = sectionHead(sec, ctx) + editorialRows(rows, ctx, 'entry', 'list-comp-');
    if (ctx.mode === 'list') html += sec.items.map(function (c, i) { return competitionDetail(c, i, sec.items.length, ctx, 3); }).join('');
    return html;
  }

  /* ---- 7. Professional experience ------------------------------------- */

  function experience(sec, ctx) {
    var fact = function (label, value) { return has(value) ? '<div><dt>' + esc(label) + '</dt><dd>' + esc(value) + '</dd></div>' : ''; };
    var list = function (items) { return '<ul class="list-elegant">' + items.filter(has).map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul>'; };
    var realImages = (sec.images || []).filter(function (it) { return has(it.src) && safeUrl(it.src); });
    var html = sectionHead(sec, ctx) +
      '<dl class="facts facts--placement">' +
        fact('Position', sec.position) +
        fact('Employer', sec.employer) +
        fact(sec.supervisorLabel || 'Supervisor', sec.supervisor) +
        fact('Location', sec.location) +
        fact('Dates', sec.dates) +
      '</dl>' +
      (has(sec.intro) ? '<div class="block prose">' + H(ctx.lvl + 1, 'h3', 'The placement') + paras(sec.intro) + '</div>' : '') +
      (has(sec.responsibilities) ? '<div class="block">' + H(ctx.lvl + 1, 'h3', 'Responsibilities') + list(sec.responsibilities) + '</div>' : '') +
      (has(sec.areas) ? '<div class="block">' + H(ctx.lvl + 1, 'h3', esc(sec.areasHeading || 'Areas of experience')) + list(sec.areas) + '</div>' : '') +
      (realImages.length ? '<div class="block" data-lightbox-group>' + H(ctx.lvl + 1, 'h3', 'Project images') + gallery(realImages, { ratio: '4 / 3' }) + '</div>' : '') +
      (sec.showResume ? '<div class="actions">' + resumeButton() + '</div>' : '');
    // Same blended image layout as Introduction, Design Philosophy, Socials and Get in Touch.
    return blendedLayout(sec, html) || html;
  }

  /* ---- 8. Socials ------------------------------------------------------ */

  /* Minimal fine-line platform icons (drawn in currentColor). */
  var SOCIAL_ICONS = {
    linkedin: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7.5 10.5v6M7.5 7.4v.1M11 16.5v-6M11 13c0-1.6 1-2.6 2.4-2.6s2.1 1 2.1 2.6v3.5"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.2 6.8v.1"/>',
    pinterest: '<circle cx="12" cy="12" r="9"/><path d="M10.6 20.6l1.9-8M12.5 12.6c-.5 1.6.6 2.6 1.9 2.6 2 0 3.2-2 3.2-4.3 0-2.6-2.1-4.4-5-4.4-3.2 0-5.1 2.3-5.1 4.6 0 1 .4 1.9 1.1 2.3"/>'
  };
  function socialIcon(platform) {
    var p = SOCIAL_ICONS[String(platform).toLowerCase()];
    if (!p) return '';
    return '<svg class="social-list__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">' + p + '</g></svg>';
  }

  function socials(sec, ctx) {
    var live = (sec.links || []).filter(function (l) { return /^https:\/\//i.test(l.url || ''); });
    var body = sectionHead(sec, ctx) +
      (has(sec.intro) ? '<div class="prose"><p>' + esc(sec.intro) + '</p></div>' : '') +
      (live.length
        ? '<ul class="social-list">' + live.map(function (l) {
            return '<li><a href="' + esc(l.url) + '" target="_blank" rel="noopener noreferrer">' +
              '<span class="social-list__name">' + socialIcon(l.platform) + esc(l.platform) + '</span>' +
              '<span class="social-list__handle">' + (has(l.handle) ? esc(l.handle) : 'Visit') + '<span class="visually-hidden"> (opens in a new tab)</span></span></a></li>';
          }).join('') + '</ul>'
        : '<p class="notice">Social and professional links will appear here soon.</p>' + tbcPara('Add real profile URLs in data/portfolio.js'));
    return blendedLayout(sec, body) || body;
  }

  /* ---- 9. Get in touch ------------------------------------------------- */

  function contact(sec, ctx) {
    var email = String(P.site.email || '').trim();
    var pfx = ctx.mode + '-contact-';
    var endpoint = safeUrl(sec.formEndpoint);
    var html = sectionHead(sec, ctx) +
      '<div class="prose"><p>' + esc(sec.invitation) + '</p></div>' +
      '<div class="block">' + H(ctx.lvl + 1, 'h3', 'Email') +
        (email ? '<a class="email-link" href="mailto:' + esc(email) + '">' + esc(email) + '</a>' : tbcPara('Email address')) +
      '</div>';
    if (sec.showForm) {
      html += '<div class="block">' + H(ctx.lvl + 1, 'h3', 'Send a message') +
        '<form class="form" data-contact-form' + (endpoint ? ' action="' + esc(endpoint) + '" method="post"' : '') + ' novalidate>' +
        (endpoint ? '' : '<p class="notice">The message form isn’t connected yet, so it can’t send anything. ' +
          (email ? 'Please use the email link above for now.' : 'Please check back soon.') + '</p>') +
        '<fieldset' + (endpoint ? '' : ' disabled') + '>' +
          '<div class="field"><label for="' + pfx + 'name">Name <span class="opt">(optional)</span></label><input id="' + pfx + 'name" name="name" type="text" autocomplete="name"></div>' +
          '<div class="field"><label for="' + pfx + 'email">Email</label><input id="' + pfx + 'email" name="email" type="email" autocomplete="email" required></div>' +
          '<div class="field"><label for="' + pfx + 'message">Message</label><textarea id="' + pfx + 'message" name="message" required></textarea></div>' +
          '<div><button type="submit" class="pill pill--solid">Send message</button></div>' +
        '</fieldset>' +
        '<p class="form__status" data-form-status role="status" aria-live="polite"></p>' +
        '</form></div>';
    }
    // Same blended image layout as Introduction, Design Philosophy and Socials.
    return blendedLayout(sec, html) || html;
  }

  /* ---- dispatch -------------------------------------------------------- */

  var RENDERERS = {
    introduction: introduction, projects: projects, philosophy: philosophy,
    drawings: drawings, thesis: thesis, competitions: competitions,
    experience: experience, socials: socials, contact: contact
  };

  function render(id, ctx) {
    var sec = P.sections[id];
    ctx = Object.assign({ mode: 'panel', view: 'index', lvl: 2, headingId: 'panel-title' }, ctx || {});
    var fn = RENDERERS[id];
    return fn ? fn(sec, ctx) : sectionHead(sec, ctx);
  }

  function renderList() {
    var toc = P.drawers.map(function (id) {
      return '<li><a href="#list-' + id + '" data-jump="list-' + id + '">' + esc(P.sections[id].label) + '</a></li>';
    }).join('');
    var body = P.drawers.map(function (id) {
      return '<section class="list-section" id="list-' + id + '" aria-labelledby="list-h-' + id + '">' +
        render(id, { mode: 'list', headingId: 'list-h-' + id }) + '</section>';
    }).join('');
    return '<div class="list-view__bar">' +
        '<a class="text-btn" href="#vanity"><span aria-hidden="true" class="arrow-left"></span>Back to the vanity</a>' +
        '<span class="list-view__brand" aria-hidden="true">' + esc(P.site.title) + '</span>' +
      '</div>' +
      '<main class="list-view__inner">' +
        '<header class="list-view__intro">' +
          '<h1 tabindex="-1">' + esc(P.site.name) + '</h1>' +
          '<p>' + esc(P.site.role) + ' · ' + esc(P.site.program) + '</p>' +
          '<nav aria-label="Portfolio sections"><ol class="toc">' + toc + '</ol></nav>' +
        '</header>' + body +
        '<p class="block"><a class="pill pill--outline" href="#vanity"><span aria-hidden="true" class="arrow-left"></span>Back to the vanity</a></p>' +
      '</main>';
  }

  /* ---- interactive enhancements --------------------------------------- */

  function enhance(root, id, ctx) {
    if (!ctx || ctx.mode !== 'list') prepareScroll(root);
    // In-page jumps (competition entries, list-view contents) without changing the URL.
    root.querySelectorAll('[data-jump]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var target = document.getElementById(a.dataset.jump);
        if (!target) return;
        e.preventDefault();
        e.stopPropagation();
        var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      });
    });

    root.querySelectorAll('[data-viewer]').forEach(setupViewer);
    if (window.AIL && window.AIL.drawingSet) window.AIL.drawingSet.mount(root);
    root.querySelectorAll('[data-contact-form]').forEach(setupForm);

    // Click / tap any portfolio image to see it larger.
    root.querySelectorAll('[data-enlarge]').forEach(function (b) {
      b.addEventListener('click', function (e) { e.preventDefault(); openLightbox(b); });
    });
    // The opening image never grows taller than the screen: its width is
    // limited by its own proportions, so portrait boards stay whole.
    root.querySelectorAll('.fig--hero img').forEach(function (im) {
      var set = function () {
        if (im.naturalWidth && im.naturalHeight) im.closest('.fig--hero').style.setProperty('--ar', (im.naturalWidth / im.naturalHeight).toFixed(4));
      };
      if (im.complete) set(); else im.addEventListener('load', set, { once: true });
    });
  }

  /* ---- Lightbox: enlarged images -----------------------------------------
     One shared overlay. Shows every image in the same project (or section),
     with previous / next, swipe on touch screens, arrow keys, Esc to close,
     and click-to-zoom for detailed boards and drawings larger than the screen.
     It sits below the brush cursor so the custom cursor stays visible. */

  var LB = null;

  function buildLightbox() {
    var el = document.createElement('div');
    el.className = 'lightbox';
    el.hidden = true;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Enlarged image');
    el.innerHTML =
      '<div class="lightbox__bar">' +
        '<span class="lightbox__count" data-lb-count></span>' +
        '<a class="pill pill--quiet lightbox__full" data-lb-full target="_blank" rel="noopener">Open full size<span class="visually-hidden"> (opens in a new tab)</span></a>' +
        '<button type="button" class="lightbox__btn" data-lb="close" aria-label="Close enlarged image"><span class="icon-x" aria-hidden="true"></span></button>' +
      '</div>' +
      '<div class="lightbox__stage" data-lb-stage><img class="lightbox__img" data-lb-img alt=""></div>' +
      '<p class="lightbox__caption" data-lb-caption></p>' +
      '<p class="lightbox__tip" data-lb-tip aria-hidden="true"></p>' +
      '<button type="button" class="lightbox__btn lightbox__nav lightbox__nav--prev" data-lb="prev" aria-label="Previous image"><span class="lightbox__chev" aria-hidden="true"></span></button>' +
      '<button type="button" class="lightbox__btn lightbox__nav lightbox__nav--next" data-lb="next" aria-label="Next image"><span class="lightbox__chev" aria-hidden="true"></span></button>';
    document.body.appendChild(el);

    var q = function (s) { return el.querySelector(s); };
    LB = {
      el: el, stage: q('[data-lb-stage]'), img: q('[data-lb-img]'), count: q('[data-lb-count]'),
      full: q('[data-lb-full]'), caption: q('[data-lb-caption]'), tip: q('[data-lb-tip]'),
      prev: q('[data-lb="prev"]'), next: q('[data-lb="next"]'), close: q('[data-lb="close"]'),
      items: [], index: 0, opener: null, zoomed: false
    };

    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-lb]');
      if (b) { var a = b.dataset.lb; if (a === 'close') closeLightbox(); else stepLightbox(a === 'next' ? 1 : -1); return; }
      if (e.target === LB.img) { if (!LB.dragged) toggleZoom(e); LB.dragged = false; return; }
      if (e.target === LB.stage || e.target === el) closeLightbox();
    });
    LB.img.addEventListener('load', updateZoomable);
    LB.img.draggable = false;

    // Drag to move around a zoomed image (mouse / pen; touch scrolls natively).
    var drag = null;
    LB.stage.addEventListener('pointerdown', function (e) {
      LB.dragged = false;
      if (!LB.zoomed || e.pointerType === 'touch') return;
      drag = { x: e.clientX, y: e.clientY, l: LB.stage.scrollLeft, t: LB.stage.scrollTop };
    });
    LB.stage.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 5) LB.dragged = true;
      LB.stage.scrollLeft = drag.l - dx;
      LB.stage.scrollTop = drag.t - dy;
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (t) { LB.stage.addEventListener(t, function () { drag = null; }); });
    window.addEventListener('resize', function () { if (!el.hidden) updateZoomable(); });

    // Swipe left / right on touch screens (when not zoomed in).
    var t0 = null;
    LB.stage.addEventListener('touchstart', function (e) {
      t0 = e.touches.length === 1 && !LB.zoomed ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
    }, { passive: true });
    LB.stage.addEventListener('touchend', function (e) {
      if (!t0 || LB.items.length < 2) return;
      var dx = e.changedTouches[0].clientX - t0.x, dy = e.changedTouches[0].clientY - t0.y;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) stepLightbox(dx < 0 ? 1 : -1);
      t0 = null;
    }, { passive: true });
  }

  function openLightbox(trigger) {
    if (!LB) buildLightbox();
    var group = trigger.closest('[data-lightbox-group]') || trigger.closest('.panel__content, .list-section') || document;
    var buttons = Array.prototype.slice.call(group.querySelectorAll('[data-enlarge]'));
    LB.items = buttons.map(function (b) {
      var im = b.querySelector('img');
      var cap = b.closest('figure') && b.closest('figure').querySelector('figcaption');
      return { src: im.getAttribute('src'), alt: im.getAttribute('alt') || '', caption: cap ? cap.textContent : '' };
    });
    LB.opener = trigger;
    LB.el.hidden = false;
    document.documentElement.classList.add('lb-open');
    window.addEventListener('keydown', onLightboxKey, true);
    showLightbox(Math.max(0, buttons.indexOf(trigger)));
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      LB.el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'ease-out' });
      LB.img.animate([{ opacity: 0, transform: 'scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.2, .78, .22, 1)' });
    }
    LB.close.focus({ preventScroll: true });
  }

  function closeLightbox() {
    if (!LB || LB.el.hidden) return;
    LB.el.hidden = true;
    setZoom(false);
    LB.img.removeAttribute('src');
    document.documentElement.classList.remove('lb-open');
    window.removeEventListener('keydown', onLightboxKey, true);
    if (LB.opener && document.contains(LB.opener)) LB.opener.focus({ preventScroll: true });
  }

  function showLightbox(i) {
    var n = LB.items.length;
    LB.index = (i + n) % n;
    var it = LB.items[LB.index];
    setZoom(false);
    LB.img.src = it.src;
    LB.img.alt = it.alt;
    LB.full.href = it.src;
    LB.caption.textContent = it.caption;
    LB.caption.hidden = !it.caption;
    LB.count.textContent = n > 1 ? (LB.index + 1) + ' / ' + n : '';
    LB.prev.hidden = LB.next.hidden = n < 2;
    LB.el.setAttribute('aria-label', 'Enlarged image' + (n > 1 ? ' ' + (LB.index + 1) + ' of ' + n : '') + (it.alt ? ': ' + it.alt : ''));
    updateZoomable();
  }

  function stepLightbox(dir) {
    if (LB.items.length < 2) return;
    showLightbox(LB.index + dir);
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      LB.img.animate([{ opacity: 0, transform: 'translateX(' + (dir * 18) + 'px)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'ease-out' });
    }
  }

  /* Zoom: shows the image at full resolution, or at least twice its fitted
     size, so details in smaller drawings and boards can still be read. */
  function fitScale() {
    var w = LB.img.naturalWidth, h = LB.img.naturalHeight;
    if (!w || !h) return 1;
    return Math.min(LB.stage.clientWidth / w, LB.stage.clientHeight / h);
  }
  function zoomWidth() {
    return Math.round(Math.max(LB.img.naturalWidth, LB.img.naturalWidth * fitScale() * 2));
  }
  function updateZoomable() {
    if (LB.zoomed) return;
    var can = LB.img.naturalWidth > 0;
    LB.stage.classList.toggle('can-zoom', can);
    LB.tip.textContent = can ? 'Select the image to zoom in' : '';
  }
  function setZoom(on) {
    LB.zoomed = on;
    LB.stage.classList.toggle('is-zoomed', on);
    LB.img.style.width = on ? zoomWidth() + 'px' : '';
    LB.tip.textContent = on ? 'Drag to look around · select again to fit the screen' : LB.tip.textContent;
  }
  function toggleZoom(e) {
    if (LB.zoomed) { setZoom(false); updateZoomable(); return; }
    if (!LB.stage.classList.contains('can-zoom')) return;
    // Zoom towards the point that was clicked.
    var s = fitScale(), sw = LB.stage.clientWidth, sh = LB.stage.clientHeight;
    var w = LB.img.naturalWidth * s, h = LB.img.naturalHeight * s;
    var r = LB.stage.getBoundingClientRect();
    var fx = Math.min(1, Math.max(0, (e.clientX - r.left - (sw - w) / 2) / w));
    var fy = Math.min(1, Math.max(0, (e.clientY - r.top - (sh - h) / 2) / h));
    var zw = zoomWidth(), zh = zw * LB.img.naturalHeight / LB.img.naturalWidth;
    setZoom(true);
    LB.stage.scrollLeft = fx * zw - sw / 2;
    LB.stage.scrollTop = fy * zh - sh / 2;
  }

  /* Captures keys first so Esc closes only the lightbox, not the drawer behind it. */
  function onLightboxKey(e) {
    if (LB.el.hidden) return;
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); closeLightbox(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); stepLightbox(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); stepLightbox(-1); }
    else if (e.key === 'Tab') {
      var items = Array.prototype.filter.call(LB.el.querySelectorAll('a[href], button'), function (b) { return !b.hidden; });
      var first = items[0], last = items[items.length - 1];
      if (!LB.el.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  function setupViewer(viewer) {
    var canvas = viewer.querySelector('[data-canvas]');
    var image = canvas.querySelector('img');
    var label = viewer.querySelector('[data-zoom-label]');
    var STEPS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];
    var zoom = 'fit';

    function currentScale() { return image.naturalWidth ? image.clientWidth / image.naturalWidth : 1; }
    function apply(z, anchor) {
      var prev = currentScale();
      var cx = anchor ? anchor.x : canvas.clientWidth / 2;
      var cy = anchor ? anchor.y : canvas.clientHeight / 2;
      var px = (canvas.scrollLeft + cx) / prev, py = (canvas.scrollTop + cy) / prev;
      zoom = z;
      if (z === 'fit') {
        canvas.classList.add('is-fit');
        image.style.width = '';
        label.textContent = 'Fit';
        return;
      }
      canvas.classList.remove('is-fit');
      image.style.width = Math.round(image.naturalWidth * z) + 'px';
      label.textContent = Math.round(z * 100) + '%';
      canvas.scrollLeft = px * z - cx;
      canvas.scrollTop = py * z - cy;
    }
    function step(dir) {
      var s = zoom === 'fit' ? currentScale() : zoom;
      var next = dir > 0 ? STEPS.find(function (v) { return v > s + 0.001; }) : STEPS.slice().reverse().find(function (v) { return v < s - 0.001; });
      if (next) apply(next);
    }
    viewer.addEventListener('click', function (e) {
      var b = e.target.closest('[data-zoom]');
      if (!b) return;
      var z = b.dataset.zoom;
      if (z === 'in') step(1); else if (z === 'out') step(-1); else if (z === 'fit') apply('fit'); else apply(1);
    });
    canvas.addEventListener('keydown', function (e) {
      if (e.key === '+' || e.key === '=') { e.preventDefault(); step(1); }
      else if (e.key === '-' || e.key === '_') { e.preventDefault(); step(-1); }
      else if (e.key === '0') { e.preventDefault(); apply('fit'); }
    });
    // Drag to pan when zoomed in (mouse / pen). Touch uses native scrolling.
    var drag = null;
    canvas.addEventListener('pointerdown', function (e) {
      if (zoom === 'fit' || e.pointerType === 'touch') return;
      drag = { x: e.clientX, y: e.clientY, l: canvas.scrollLeft, t: canvas.scrollTop };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!drag) return;
      canvas.scrollLeft = drag.l - (e.clientX - drag.x);
      canvas.scrollTop = drag.t - (e.clientY - drag.y);
    });
    ['pointerup', 'pointercancel'].forEach(function (t) { canvas.addEventListener(t, function () { drag = null; }); });
    // Double-click toggles between fit and 100%.
    canvas.addEventListener('dblclick', function (e) {
      var r = canvas.getBoundingClientRect();
      if (zoom === 'fit') apply(1, { x: e.clientX - r.left, y: e.clientY - r.top }); else apply('fit');
    });
  }

  function setupForm(form) {
    var status = form.querySelector('[data-form-status]');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var endpoint = form.getAttribute('action');
      if (!endpoint) return;   // not configured: never pretend to send
      var emailInput = form.querySelector('[name="email"]');
      var msgInput = form.querySelector('[name="message"]');
      if (!emailInput.value.trim() || !emailInput.checkValidity() || !msgInput.value.trim()) {
        status.className = 'form__status is-error';
        status.textContent = 'Please add a valid email address and a message.';
        (!emailInput.value.trim() || !emailInput.checkValidity() ? emailInput : msgInput).focus();
        return;
      }
      var btn = form.querySelector('[type="submit"]');
      btn.disabled = true;
      status.className = 'form__status';
      status.textContent = 'Sending…';
      fetch(endpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          status.className = 'form__status is-ok';
          status.textContent = 'Thank you — your message was sent.';
          form.reset();
        })
        .catch(function () {
          status.className = 'form__status is-error';
          status.textContent = 'Sorry, the message could not be sent. Please try again later.';
        })
        .then(function () { btn.disabled = false; });
    });
  }

  window.AIL = window.AIL || {};
  window.AIL.panels = { render: render, renderList: renderList, enhance: enhance, play: playScroll };
})();
