/* ==========================================================================
   SCENE — extends the room beyond the edges of the vanity image
   --------------------------------------------------------------------------
   On screens that are wider or taller than the image, the wall, ceiling and
   floor need to continue so there are no abrupt brown strips.

   For each edge this builds a small texture from the image's OWN edge pixels:
     • a narrow mirrored band right at the seam, so wood grain, paint and
       floor texture continue without a visible line, then
     • a gradual blur that softens into the wall / ceiling / floor tones.
   CSS then stretches the outermost line to the screen edge and adds a warm
   shadow fade. Only pure wall, ceiling and floor pixels are ever used — the
   vanity and mirror are never copied — and the original image is untouched.

   If the browser blocks reading the image (e.g. when index.html is opened
   by double-clicking rather than through a local server), CSS fallbacks in
   styles.css are used instead.
   ========================================================================== */
(function () {
  'use strict';

  // depth   = thickness of the generated texture, in image pixels
  // mirror  = how many edge pixels are reflected at the seam (all wall/floor)
  // blur    = maximum blur radius reached at the outer end
  var EDGES = {
    top:    { depth: 64,  mirror: 3,  blur: 36 },
    // The checkered floor repeats roughly every 200px, so it needs a much
    // stronger blur to become a smooth floor tone without streaks.
    bottom: { depth: 120, mirror: 3, blur: 300, curve: 1.35 },
    left:   { depth: 96,  mirror: 18, blur: 40 },
    right:  { depth: 96,  mirror: 18, blur: 40 }
  };

  /* Box-blur one line of RGBA pixels (stride = distance between pixels). */
  function blurLine(src, start, stride, length, radius, out, outStart, outStride) {
    var r = 0, g = 0, b = 0, i, lo, hi, n;
    if (radius < 1) {
      for (i = 0; i < length; i++) {
        var s = start + i * stride, o = outStart + i * outStride;
        out[o] = src[s]; out[o + 1] = src[s + 1]; out[o + 2] = src[s + 2]; out[o + 3] = 255;
      }
      return;
    }
    // prefix sums
    var pr = new Float64Array(length + 1), pg = new Float64Array(length + 1), pb = new Float64Array(length + 1);
    for (i = 0; i < length; i++) {
      var p = start + i * stride;
      pr[i + 1] = pr[i] + src[p]; pg[i + 1] = pg[i] + src[p + 1]; pb[i + 1] = pb[i] + src[p + 2];
    }
    for (i = 0; i < length; i++) {
      lo = Math.max(0, i - radius); hi = Math.min(length - 1, i + radius); n = hi - lo + 1;
      r = (pr[hi + 1] - pr[lo]) / n; g = (pg[hi + 1] - pg[lo]) / n; b = (pb[hi + 1] - pb[lo]) / n;
      var q = outStart + i * outStride;
      out[q] = r; out[q + 1] = g; out[q + 2] = b; out[q + 3] = 255;
    }
  }

  function radiusAt(k, spec) {
    // gentle ease-in so the seam stays crisp and the far end is soft
    var t = Math.min(1, k / (spec.depth * 0.75));
    return Math.round(spec.blur * Math.pow(t, spec.curve || 2));
  }

  function buildEdge(side, data, W, H) {
    var spec = EDGES[side];
    var D = spec.depth;
    var horizontal = side === 'top' || side === 'bottom';
    var cw = horizontal ? W : D, ch = horizontal ? D : H;
    var canvas = document.createElement('canvas');
    canvas.width = cw; canvas.height = ch;
    var ctx = canvas.getContext('2d');
    var out = ctx.createImageData(cw, ch);
    for (var k = 0; k < D; k++) {
      var m = Math.min(k, spec.mirror - 1);      // reflected line, then hold
      var r = radiusAt(k, spec);
      if (side === 'bottom') {      // seam at row 0
        blurLine(data, ((H - 1 - m) * W) * 4, 4, W, r, out.data, (k * cw) * 4, 4);
      } else if (side === 'top') {  // seam at last row
        blurLine(data, (m * W) * 4, 4, W, r, out.data, ((D - 1 - k) * cw) * 4, 4);
      } else if (side === 'left') { // seam at last column
        blurLine(data, m * 4, W * 4, H, r, out.data, (D - 1 - k) * 4, cw * 4);
      } else {                      // right: seam at column 0
        blurLine(data, (W - 1 - m) * 4, W * 4, H, r, out.data, k * 4, cw * 4);
      }
    }
    ctx.putImageData(out, 0, 0);
    var result = { url: toUrl(canvas) };
    // Floor corners: when the screen leaves room both beside AND below the
    // image (phones turned sideways), the floor continues into the corners
    // using the floor texture's own outermost columns.
    if (side === 'bottom') {
      result.cornerLeft = toUrl(columnCanvas(out, 0, cw, D));
      result.cornerRight = toUrl(columnCanvas(out, cw - 1, cw, D));
    }
    return result;
  }

  function columnCanvas(imgData, x, w, h) {
    var c = document.createElement('canvas');
    c.width = 1; c.height = h;
    var cx = c.getContext('2d');
    var col = cx.createImageData(1, h);
    for (var y = 0; y < h; y++) {
      var s = (y * w + x) * 4, o = y * 4;
      col.data[o] = imgData.data[s]; col.data[o + 1] = imgData.data[s + 1];
      col.data[o + 2] = imgData.data[s + 2]; col.data[o + 3] = 255;
    }
    cx.putImageData(col, 0, 0);
    return c;
  }

  function toUrl(canvas) {
    return new Promise(function (resolve) {
      if (canvas.toBlob) canvas.toBlob(function (blob) { resolve(blob ? URL.createObjectURL(blob) : canvas.toDataURL()); }, 'image/png');
      else resolve(canvas.toDataURL());
    });
  }

  function build(stage, img) {
    var W = img.naturalWidth, H = img.naturalHeight;
    if (!W || !H) return;
    var data;
    try {
      var c = document.createElement('canvas');
      c.width = W; c.height = H;
      var cx = c.getContext('2d');
      cx.drawImage(img, 0, 0);
      data = cx.getImageData(0, 0, W, H).data;   // throws on file:// (tainted)
    } catch (e) {
      stage.classList.add('ext-fallback');
      return;
    }
    var sides = Object.keys(EDGES);
    var built = sides.map(function (s) { return buildEdge(s, data, W, H); });
    var bottom = built[sides.indexOf('bottom')];
    var all = built.map(function (b) { return b.url; }).concat([bottom.cornerLeft, bottom.cornerRight]);
    Promise.all(all).then(function (urls) {
      sides.forEach(function (s, i) {
        stage.style.setProperty('--ext-' + s, 'url("' + urls[i] + '")');
      });
      stage.style.setProperty('--ext-corner-bl', 'url("' + urls[sides.length] + '")');
      stage.style.setProperty('--ext-corner-br', 'url("' + urls[sides.length + 1] + '")');
      stage.classList.add('ext-ready');
    }).catch(function () { stage.classList.add('ext-fallback'); });
  }

  function init() {
    var stage = document.getElementById('stage');
    var img = document.getElementById('vanity-image');
    if (!stage || !img) return;
    var go = function () {
      // Let the first paint happen before doing pixel work.
      if (window.requestIdleCallback) requestIdleCallback(function () { build(stage, img); }, { timeout: 400 });
      else setTimeout(function () { build(stage, img); }, 30);
    };
    if (img.complete && img.naturalWidth) go();
    else img.addEventListener('load', go, { once: true });
  }

  window.AIL = window.AIL || {};
  window.AIL.scene = { init: init, EDGES: EDGES };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
