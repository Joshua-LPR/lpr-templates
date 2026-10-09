/* ============================================================
   LPR Page Flow  —  page-flow.js
   ------------------------------------------------------------
   Automatic multi-page flow for letter-family sheets. Opt in by
   adding `data-flow` to a `.sheet.letter`. Its `.lh-body` is ONE
   continuous flow: whatever doesn't fit is laid into generated
   continuation sheets (compact heading + "Page X of Y"), and the
   whole letter is re-laid from the top whenever content changes
   — no manual per-page adjustment, ever.

   Why real sheets (not @page / print-time pagination): screen,
   print and the html2canvas PDF/PNG export must all see the same
   pages. brand.css already prints one .sheet per page and
   template-tools.js's resolveExportSheets() already exports one
   page per visible .sheet, so nothing downstream had to change.

   Edit mode: template-tools.js calls setEditing(true) on entering
   (pages merge back into the one source sheet — caret, undo and
   the per-sheet token census keep working on a single sheet) and
   setEditing(false) on Done (re-paginates). While editing, dashed
   guides show where each page will begin.

   Optional template attribute:
     data-flow-head="<sel>|<sel>"  text sources for the continuation
       heading, joined with " · ". Default: recipient name | date.

   Spec: style-guide.html "Multi-Page Letters"; PROJECT.md.

   Public API (window.LPR_FLOW):
     paginate()     lay out every [data-flow] sheet now
     unpaginate()   merge every flow back into its source sheet
     flush()        run a pending (debounced) re-layout now
     hold()         freeze pages during an export; returns release()
     insertBreak()  edit mode: forced new page before the caret's block
     setEditing(b)  called by template-tools.js toggleEdit()

   Load order: after mode-bar.js, before template-tools.js.
   ============================================================ */
(function () {
  'use strict';

  var TOKEN_SEL = window.LPR_UTIL.TOKEN_SEL; // shared helper in user.js
  // Blocks that never split across pages.
  var KEEP_SEL = '.date, .recipient, .subject, .signoff, .sig-block, .info-grid, ' +
                 '.acct-table, .callout, .checklist, .legal, table, [data-flow-keep]';
  // Blocks that carry what precedes them onto their page (the sign-off and
  // signature block always bring at least MIN_LINES lines of body text).
  var WITH_PREV_SEL = '.signoff, .sig-block';
  // Blocks that must not end a page (a heading stays with what follows).
  var WITH_NEXT_SEL = '.subject, h1, h2, h3, h4, h5, h6, [data-flow-keep-next]';
  var DEFAULT_HEAD = '.recipient [data-contact-field="name"]|.date [data-fill-field]';
  var MIN_LINES = 2;
  var ICON_SRC = 'assets/logo-icon.png';

  var sources = [];
  var editing = false;
  var busy = false;
  var timer = null;
  var held = false;
  var dirty = false;
  var observer = null;
  var seq = 0;

  /* ================================================================
     DOM HELPERS
     ================================================================ */
  function bodyOf(sheet) { return sheet.querySelector(':scope > .lh-body'); }

  function contPagesOf(src) {
    var out = [], n = src.nextElementSibling;
    while (n && n.hasAttribute('data-flow-page')) { out.push(n); n = n.nextElementSibling; }
    return out;
  }

  function isSplittable(el) {
    return !el.matches(KEEP_SEL) && !isHeadingLike(el);
  }

  function lineHeight(el) {
    var cs = getComputedStyle(el);
    var lh = parseFloat(cs.lineHeight);
    return isNaN(lh) ? parseFloat(cs.fontSize) * 1.6 : lh;
  }

  // Screen-px per layout-px (phone view scales sheets with a transform;
  // offsetTop/offsetHeight ignore it, getBoundingClientRect doesn't).
  function scaleOf(el) {
    return el.offsetHeight ? el.getBoundingClientRect().height / el.offsetHeight : 1;
  }

  var BLOCK_DISPLAY = /^(block|list-item|table|flex|grid|flow-root)$/;
  // Inline wrappers that Range.extractContents() may split in two (and
  // mergeInto() fuses back). Block elements are never fused.
  var INLINE_TAG = /^(B|STRONG|I|EM|U|S|SPAN|A|FONT|SMALL|SUB|SUP|MARK)$/;

  function isBlockEl(n) {
    return n.nodeType === 1 && BLOCK_DISPLAY.test(getComputedStyle(n).display);
  }
  function hasBlockChildren(el) { return [].some.call(el.children, isBlockEl); }

  // Every non-blank text node in `nodes` renders bold.
  function allBold(nodes) {
    var seen = false, ok = true;
    nodes.forEach(function (n) {
      var w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT, null), t = n.nodeType === 3 ? n : w.nextNode();
      for (; t && ok; t = w.nextNode()) {
        if (!t.data.trim()) continue;
        seen = true;
        if ((parseInt(getComputedStyle(t.parentElement).fontWeight, 10) || 400) < 600) ok = false;
        if (n.nodeType === 3) break;
      }
    });
    return seen && ok;
  }

  // Headings — and short all-bold lines that read as one ("1. Acknowledgment
  // of …", "Duration:") — never end a page and never split.
  function isHeadingLike(el) {
    if (el.matches(WITH_NEXT_SEL)) return true;
    if (!/^(P|DIV|LI)$/.test(el.tagName) || hasBlockChildren(el)) return false;
    var text = el.textContent.trim();
    return !!text && text.length <= 120 && allBold([el]);
  }

  /* ================================================================
     MEASURING (body coordinates, layout px — robust to phone scaling
     and to nested elements, whose offsetParent may differ)
     ================================================================ */
  function ctxOf(body) {
    return {
      top: body.getBoundingClientRect().top,
      scale: scaleOf(body),
      limit: body.clientHeight - (parseFloat(getComputedStyle(body).paddingBottom) || 0)
    };
  }
  function boxOf(nodes, ctx) {
    var r;
    if (nodes.length === 1 && nodes[0].nodeType === 1) r = nodes[0].getBoundingClientRect();
    else {
      var rg = document.createRange();
      rg.setStartBefore(nodes[0]);
      rg.setEndAfter(nodes[nodes.length - 1]);
      r = rg.getBoundingClientRect();
    }
    if (!r.width && !r.height) return null;                      // hidden / empty
    return { top: (r.top - ctx.top) / ctx.scale, bottom: (r.bottom - ctx.top) / ctx.scale, height: r.height / ctx.scale };
  }

  /* ================================================================
     SPLITTING — any block: text blocks split between lines, boxes
     (lists, list items, paste wrappers…) split between their children.
     Each split inserts and returns a TAIL right after the element; the
     head and tail share data-flow-head / data-flow-tail ids so
     unpaginate() can merge them back exactly.
     ================================================================ */
  function makeTail(el) {
    var tail = el.cloneNode(false);
    tail.removeAttribute('data-flow-head');
    tail.removeAttribute('data-flow-tail');
    tail.removeAttribute('id');
    if (tail.tagName === 'LI') tail.classList.add('flow-li-cont'); // continued item: no second number/bullet
    var id = String(++seq);
    el.setAttribute('data-flow-head', id);
    tail.setAttribute('data-flow-tail', id);
    return tail;
  }

  function splitBlock(el, ctx, force) {
    if (el.matches(TOKEN_SEL) || /^(IMG|SVG|HR|BR)$/.test(el.tagName)) return null;
    if (!force && el.matches(KEEP_SEL)) return null;
    if (hasBlockChildren(el)) return splitBox(el, ctx, force);
    if (!force && isHeadingLike(el)) return null;
    return splitText(el, ctx, force);
  }

  // Word-boundary break points in el, never inside a token span.
  // Each entry: { node, at } = where the tail would start, plus the last
  // character of the preceding word (measured to find its line).
  function candidates(el) {
    var out = [];
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var node;
    while ((node = walker.nextNode())) {
      var tok = node.parentElement && node.parentElement.closest(TOKEN_SEL);
      if (tok && el.contains(tok)) continue;
      var text = node.data, re = /\s+/g, m;
      while ((m = re.exec(text))) {
        var end = m.index + m[0].length;
        if (m.index === 0 || end >= text.length) continue;
        out.push({ node: node, at: end, prev: m.index - 1 });
      }
    }
    return out;
  }

  // 0-based line index (within el) of the word ending just before candidate c.
  function lineOf(el, c, lh, ctx) {
    var r = document.createRange();
    r.setStart(c.node, c.prev);
    r.setEnd(c.node, c.prev + 1);
    var rect = r.getBoundingClientRect();
    return Math.floor((((rect.top + rect.bottom) / 2 - el.getBoundingClientRect().top) / ctx.scale) / lh);
  }

  // Split a text block so the head ends above ctx.limit, keeping at least
  // MIN_LINES on each side (1 when forced). Returns the tail or null.
  function splitText(el, ctx, force) {
    var box = boxOf([el], ctx);
    if (!box) return null;
    var minLines = force ? 1 : MIN_LINES;
    var lh = lineHeight(el);
    var total = Math.round(box.height / lh);
    if (total < minLines * 2) return null;
    var maxHead = Math.floor((ctx.limit - box.top) / lh + 0.01);
    if (total - maxHead < minLines) maxHead = total - minLines;
    if (maxHead < minLines || maxHead >= total) return null;

    var cands = candidates(el);
    if (!cands.length) return null;
    // Largest k whose preceding word sits on a line < maxHead (lines are
    // monotonic in k, so binary search).
    var lo = 0, hi = cands.length - 1, k = -1;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      if (lineOf(el, cands[mid], lh, ctx) < maxHead) { k = mid; lo = mid + 1; }
      else hi = mid - 1;
    }
    if (k < 0 || lineOf(el, cands[k], lh, ctx) + 1 < minLines) return null;

    var range = document.createRange();
    range.setStart(cands[k].node, cands[k].at);
    range.setEndAfter(el.lastChild);
    var tail = makeTail(el);
    tail.appendChild(range.extractContents()); // clones any partially-split inline wrappers
    el.after(tail);
    return tail;
  }

  // A box's children as segments: each block element on its own, runs of
  // inline content (text + inline elements) grouped. Blank text is skipped.
  function segmentsOf(el) {
    var segs = [], run = null;
    [].forEach.call(el.childNodes, function (n) {
      if (n.nodeType === 3 && !n.data.trim()) return;
      if (n.nodeType !== 1 && n.nodeType !== 3) return;
      if (isBlockEl(n)) { run = null; segs.push({ nodes: [n], el: n }); }
      else if (run) run.nodes.push(n);
      else { run = { nodes: [n], el: null }; segs.push(run); }
    });
    return segs;
  }
  function segIsHeading(seg) { return seg.el ? isHeadingLike(seg.el) : allBold(seg.nodes) && seg.nodes.reduce(function (a, n) { return a + n.textContent.trim().length; }, 0) <= 120; }

  // Split a box between its children (recursing into the child that
  // crosses the limit). Numbered lists continue their numbering.
  function splitBox(el, ctx, force) {
    var segs = segmentsOf(el), k = -1;
    for (var i = 0; i < segs.length; i++) {
      var b = boxOf(segs[i].nodes, ctx);
      if (b && b.bottom > ctx.limit + 0.5) { k = i; break; }
    }
    if (k < 0) return null;
    var cutNode = null;
    if (segs[k].el) cutNode = splitBlock(segs[k].el, ctx, force);   // tail inserted right after segs[k].el
    if (!cutNode) {
      var j = k;
      while (j > 0 && segIsHeading(segs[j - 1])) j--;            // a heading stays with what follows
      if (j === 0) {
        if (!force) return null;
        j = k > 0 ? k : 1;
        if (j >= segs.length) return null;
      }
      cutNode = segs[j].nodes[0];
    }
    var tail = makeTail(el);
    for (var n = cutNode; n; ) { var next = n.nextSibling; tail.appendChild(n); n = next; }
    if (el.tagName === 'OL') {
      var start = parseInt(el.getAttribute('start'), 10);
      if (isNaN(start)) start = 1;
      var headItems = [].filter.call(el.children, function (c) { return c.tagName === 'LI'; }).length;
      var first = tail.firstElementChild;
      var continued = first && first.tagName === 'LI' && first.hasAttribute('data-flow-tail');
      tail.setAttribute('start', String(start + headItems - (continued ? 1 : 0)));
    }
    el.after(tail);
    return tail;
  }

  // Append b's children to a, fusing inline wrappers (<b>, <i>, <span
  // style>) that Range.extractContents() split in two. Block children
  // (list items, paragraphs) are never fused — they are separate blocks.
  function mergeInto(a, b) {
    while (b.firstChild) {
      var x = a.lastChild, y = b.firstChild;
      if (x && x.nodeType === 1 && y.nodeType === 1 && INLINE_TAG.test(x.tagName) && !x.matches(TOKEN_SEL) &&
          x.cloneNode(false).isEqualNode(y.cloneNode(false))) {
        mergeInto(x, y);
        y.remove();
      } else {
        a.appendChild(y);
      }
    }
  }

  /* ================================================================
     STRUCTURE REPAIR — content pasted before the clean-paste handler
     existed (or by any other route) can arrive as one wrapper element,
     or inside the date line / recipient block. Put it back in the body.
     ================================================================ */
  var WRAPPER_TAG = /^(B|STRONG|I|EM|U|SPAN|FONT|DIV|SECTION|ARTICLE|MAIN)$/;

  function unwrap(el) {
    var tag = el.tagName;
    // A real bold/italic wrapper around paragraphs keeps its formatting on
    // each paragraph; Google Docs' <b style="font-weight:normal"> wrapper doesn't.
    var keepFormat = (/^(B|STRONG)$/.test(tag) && !/normal|400/.test(el.style.fontWeight)) ||
                     (/^(I|EM)$/.test(tag) && el.style.fontStyle !== 'normal') || tag === 'U';
    [].slice.call(el.childNodes).forEach(function (c) {
      if (keepFormat && c.nodeType === 1 && isBlockEl(c)) {
        var w = document.createElement(tag);
        while (c.firstChild) w.appendChild(c.firstChild);
        c.appendChild(w);
      }
      el.before(c);
    });
    el.remove();
  }

  // Paragraph-level blocks (no field tokens) that ended up inside the date
  // line or recipient block move out to the body — before the box if they
  // came before its fields, after it otherwise. Typed inline text and the
  // recipient's own line <div>s stay put.
  var PASTED_BLOCK = /^(P|OL|UL|H[1-6]|TABLE|BLOCKQUOTE|PRE|DIV)$/;
  function hoistOut(box) {
    var lineDivsAreOwn = box.matches('.recipient');
    // A paste wrapper inside the box (Chrome turns Google Docs' <b> wrapper
    // into a <span> holding the paragraphs) is opened up first.
    [].slice.call(box.children).forEach(function (c) {
      if (WRAPPER_TAG.test(c.tagName) && !c.className && !c.matches(TOKEN_SEL) && hasBlockChildren(c)) unwrap(c);
    });
    var nodes = [].slice.call(box.children), firstOwn = -1;
    nodes.forEach(function (n, i) { if (firstOwn < 0 && (n.matches(TOKEN_SEL) || n.querySelector(TOKEN_SEL))) firstOwn = i; });
    var before = [], after = [];
    nodes.forEach(function (n, i) {
      if (!PASTED_BLOCK.test(n.tagName) || n.querySelector(TOKEN_SEL)) return;
      if (lineDivsAreOwn && n.tagName === 'DIV') return;
      (firstOwn >= 0 && i < firstOwn ? before : after).push(n);
    });
    before.forEach(function (n) { box.before(n); });
    for (var i = after.length - 1; i >= 0; i--) box.after(after[i]);
    if (box.matches('.date') && !box.querySelector(TOKEN_SEL) && !box.textContent.trim()) box.remove();
    return before.length + after.length > 0;
  }

  // Loose text / inline elements directly in the body can't be measured
  // or moved between pages — give each run its own paragraph.
  function wrapLooseInline(body) {
    var run = null, changed = false;
    [].slice.call(body.childNodes).forEach(function (n) {
      var loose = (n.nodeType === 3 && n.data.trim()) || (n.nodeType === 1 && !isBlockEl(n) && !n.hasAttribute('data-flow-break') && n.textContent.trim());
      if (!loose) {
        if (n.nodeType === 3 && run) run.appendChild(n);      // keep the spaces between inline pieces
        else if (n.nodeType === 1) run = null;
        return;
      }
      if (!run) { run = document.createElement('p'); n.before(run); changed = true; }
      run.appendChild(n);
    });
    return changed;
  }

  function normalizeFlow(body) {
    for (var guard = 0, changed = true; changed && guard < 20; guard++) {
      changed = wrapLooseInline(body);
      [].slice.call(body.children).forEach(function (el) {
        if (!el.parentNode) return;
        if (WRAPPER_TAG.test(el.tagName) && !el.className && !el.matches(TOKEN_SEL) && hasBlockChildren(el)) {
          unwrap(el);
          changed = true;
        } else if (el.matches('.date, .recipient') && hoistOut(el)) {
          changed = true;
        }
      });
    }
  }

  /* ================================================================
     LAYOUT
     ================================================================ */
  // First node on this page's body that must move to the next page, or null.
  function findCut(body) {
    var ctx = ctxOf(body);
    var kids = [].filter.call(body.children, function (el) {
      return el.offsetParent !== null || el.hasAttribute('data-flow-break');
    });
    for (var i = 0; i < kids.length; i++) {
      var el = kids[i];
      if (el.hasAttribute('data-flow-break')) {
        if (i > 0 && kids.slice(i + 1).some(function (k) { return k.offsetParent !== null; })) return el;
        continue;
      }
      var b = boxOf([el], ctx);
      if (!b || b.bottom <= ctx.limit + 0.5) continue;
      return resolveCut(kids, i, ctx);
    }
    return null;
  }

  // Split `el` so roughly its last MIN_LINES lines (or last item) move on.
  function carryLines(el, ctx) {
    var b = boxOf([el], ctx);
    if (!b) return null;
    var c = { top: ctx.top, scale: ctx.scale, limit: b.bottom - MIN_LINES * lineHeight(el) + 1 };
    return splitBlock(el, c, false);
  }

  function resolveCut(kids, i, ctx) {
    var el = kids[i];
    if (isSplittable(el)) {
      var tail = splitBlock(el, ctx, false);
      if (tail) return tail;
    }
    var j = i; // index of the first block that moves
    while (j > 0 && kids[j].matches(WITH_PREV_SEL)) {
      var prev = kids[j - 1];
      j--;
      if (prev.matches(WITH_PREV_SEL)) continue;          // chained: carry it too
      if (isSplittable(prev)) {
        var t = carryLines(prev, ctx);                     // carry its last lines
        if (t) return t;
      }
      break;                                               // carry prev whole
    }
    while (j > 0 && isHeadingLike(kids[j - 1])) j--;
    if (j === 0) {
      // Nothing would stay on this page. Never clip text: split the block
      // that doesn't fit even against the keep rules.
      var forced = splitBlock(el, ctx, true);
      if (forced) return forced;
      j = i > 0 ? i : 1;          // truly unsplittable (e.g. one huge image): its own page
    }
    return kids[j] || null;
  }

  function makePage(src) {
    var pg = document.createElement('div');
    pg.className = src.className.replace(/\btt-editing\b/g, '').trim() + ' flow-page';
    pg.setAttribute('data-flow-page', '');
    if (src.hasAttribute('data-mode-when')) pg.setAttribute('data-mode-when', src.getAttribute('data-mode-when'));
    // Stationery repeats on every page (mode-bar.js re-queries
    // [data-mode-when] on each switch, so cloned watermarks follow it).
    src.querySelectorAll(':scope > .watermark').forEach(function (w) { pg.appendChild(w.cloneNode(true)); });
    var head = document.createElement('div');
    head.className = 'flow-head';
    head.innerHTML = '<img src="' + ICON_SRC + '" alt=""/><span class="flow-head-meta"></span>';
    pg.appendChild(head);
    var body = document.createElement('div');
    body.className = bodyOf(src).className;
    pg.appendChild(body);
    var foot = src.querySelector(':scope > .lh-footer');
    if (foot) pg.appendChild(foot.cloneNode(true));
    return pg;
  }

  // Continuation heading: the recipient's name and the letter date (field
  // values only, never a whole block). A document with neither — an
  // agreement or addendum — uses its title (first heading) instead.
  function headMeta(src) {
    var clean = function (el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; };
    var sels = (src.getAttribute('data-flow-head') || DEFAULT_HEAD).split('|');
    var meta = sels.map(function (sel) { return clean(src.querySelector(sel.trim())); }).filter(Boolean).join(' · ');
    if (!meta) {
      var title = [].filter.call(bodyOf(src).children, function (el) { return el.offsetParent !== null; }).find(isHeadingLike);
      meta = clean(title);
    }
    return meta.length > 90 ? meta.slice(0, 89).trim() + '…' : meta;
  }

  function layout(src) {
    var page = src;
    for (var guard = 0; guard < 60; guard++) {
      var cut = findCut(bodyOf(page));
      if (!cut) break;
      var next = makePage(src);
      page.after(next);
      var nb = bodyOf(next), n = cut;
      while (n) { var after = n.nextSibling; nb.appendChild(n); n = after; }
      page = next;
    }
    var pages = [src].concat(contPagesOf(src));
    var meta = headMeta(src);
    pages.forEach(function (pg, i) {
      var num = pg.querySelector(':scope > .flow-pageno');
      if (pages.length > 1) {
        if (!num) {
          num = document.createElement('div');
          num.className = 'flow-pageno';
          pg.appendChild(num);
        }
        num.textContent = 'Page ' + (i + 1) + ' of ' + pages.length;
      } else if (num) {
        num.remove();
      }
      if (i > 0) pg.querySelector('.flow-head-meta').textContent = meta;
      pg.classList.toggle('flow-last', i === pages.length - 1);
    });
  }

  function unpaginateOne(src) {
    var body = bodyOf(src);
    contPagesOf(src).forEach(function (pg) {
      var b = bodyOf(pg);
      while (b.firstChild) body.appendChild(b.firstChild);
      pg.remove();
    });
    var h;
    while ((h = body.querySelector('[data-flow-head]'))) {
      var id = h.getAttribute('data-flow-head');
      h.removeAttribute('data-flow-head');
      var t = body.querySelector('[data-flow-tail="' + id + '"]');
      if (!t) continue;
      // A tail that was itself split hands its own head-id to the merged block.
      if (t.hasAttribute('data-flow-head')) h.setAttribute('data-flow-head', t.getAttribute('data-flow-head'));
      mergeInto(h, t);
      t.remove();
      h.normalize();
    }
    body.querySelectorAll('[data-flow-tail]').forEach(function (el) { el.removeAttribute('data-flow-tail'); });
    var num = src.querySelector(':scope > .flow-pageno');
    if (num) num.remove();
    src.classList.remove('flow-last');
  }

  // Run fn with our own DOM churn hidden from the MutationObserver.
  function quietly(fn) {
    busy = true;
    try { fn(); }
    finally {
      if (observer) observer.takeRecords();
      busy = false;
    }
  }

  function paginate() {
    if (editing) return;
    quietly(function () {
      sources.forEach(function (src) { unpaginateOne(src); normalizeFlow(bodyOf(src)); layout(src); });
    });
  }

  function unpaginate() {
    quietly(function () { sources.forEach(unpaginateOne); });
  }

  /* ================================================================
     EDIT MODE — page-break guides
     ================================================================ */
  function clearGuides() {
    document.querySelectorAll('.flow-guide').forEach(function (g) { g.remove(); });
  }

  // Where each page will begin: lay out an off-screen copy of the
  // continuous sheet, then map each page's first block (and, for a split
  // paragraph, the character offset) back onto the live sheet.
  function updateGuides() {
    clearGuides();
    if (!editing) return;
    quietly(function () {
      sources.forEach(function (src) {
        if (src.offsetParent === null) return;
        var kids = [].slice.call(bodyOf(src).children);
        kids.forEach(function (k, i) { k.setAttribute('data-flow-i', i); });
        var host = document.createElement('div');
        host.className = 'flow-measure';
        var copy = src.cloneNode(true);
        copy.classList.remove('tt-editing');
        copy.removeAttribute('contenteditable');
        host.appendChild(copy);
        document.body.appendChild(host);
        normalizeFlow(bodyOf(copy));
        layout(copy);
        var starts = contPagesOf(copy).map(function (pg) {
          var first = bodyOf(pg).firstElementChild;
          if (!first) return null;
          var i = first.getAttribute('data-flow-i'), offset = 0;
          if (first.hasAttribute('data-flow-tail')) {
            var pieces = host.querySelectorAll('[data-flow-i="' + i + '"]');
            for (var n = 0; n < pieces.length && pieces[n] !== first; n++) offset += pieces[n].textContent.length;
          }
          return { i: i, offset: offset };
        });
        host.remove();

        var srcRect = src.getBoundingClientRect();
        starts.forEach(function (s, idx) {
          if (!s) return;
          var target = kids[+s.i];
          if (!target) return;
          var y = s.offset ? textTop(target, s.offset) : target.getBoundingClientRect().top;
          if (y == null) return;
          var g = document.createElement('div');
          g.className = 'flow-guide no-print';
          g.style.top = (y + window.scrollY - 4) + 'px';
          g.style.left = (srcRect.left + window.scrollX) + 'px';
          g.style.width = srcRect.width + 'px';
          g.innerHTML = '<span>Page ' + (idx + 2) + ' begins</span>';
          document.body.appendChild(g);
        });
        kids.forEach(function (k) { k.removeAttribute('data-flow-i'); });
      });
    });
  }

  // Viewport top of the character at `offset` within el's text.
  function textTop(el, offset) {
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), node;
    while ((node = walker.nextNode())) {
      if (offset <= node.data.length) {
        var r = document.createRange();
        var at = Math.min(offset, node.data.length - 1);
        r.setStart(node, Math.max(at, 0));
        r.setEnd(node, Math.max(at, 0) + (node.data.length ? 1 : 0));
        return r.getBoundingClientRect().top;
      }
      offset -= node.data.length;
    }
    return null;
  }

  function setEditing(on) {
    if (on) {
      unpaginate();
      editing = true;
      document.querySelectorAll('[data-flow-break]').forEach(function (b) { b.setAttribute('contenteditable', 'false'); });
      schedule();
    } else {
      editing = false;
      clearGuides();
      paginate();
    }
  }

  function insertBreak() {
    var sel = window.getSelection();
    if (!editing || !sel.rangeCount) return;
    var node = sel.getRangeAt(0).startContainer;
    var el = node.nodeType === 1 ? node : node.parentElement;
    var src = el && el.closest('[data-flow]');
    if (!src) return;
    var body = bodyOf(src), block = el;
    while (block && block.parentElement !== body) block = block.parentElement;
    if (!block || block.hasAttribute('data-flow-break')) return;
    var br = document.createElement('div');
    br.className = 'flow-break';
    br.setAttribute('data-flow-break', '');
    br.setAttribute('contenteditable', 'false');
    body.insertBefore(br, block);
    schedule();
  }

  /* ================================================================
     SCHEDULING
     ================================================================ */
  function run() {
    timer = null;
    if (editing) updateGuides(); else paginate();
  }

  function schedule() {
    if (busy) return;
    if (held) { dirty = true; return; }
    clearTimeout(timer);
    timer = setTimeout(run, 120);
  }

  // Freeze the pages while an export is capturing them (inlineImgSrcs()
  // swaps <img> srcs; a re-layout mid-capture would detach the sheets
  // html2canvas is rendering). Returns release(); re-flows once if needed.
  function hold() {
    flush();
    held = true;
    return function release() {
      held = false;
      if (dirty) { dirty = false; schedule(); }
    };
  }

  function flush() {
    if (!timer) return;
    clearTimeout(timer);
    run();
  }

  /* ================================================================
     INIT
     ================================================================ */
  function init() {
    sources = [].slice.call(document.querySelectorAll('.sheet[data-flow]'));
    if (!sources.length) return;
    observer = new MutationObserver(schedule);
    var roots = [];
    sources.forEach(function (s) { if (roots.indexOf(s.parentNode) < 0) roots.push(s.parentNode); });
    roots.forEach(function (r) {
      observer.observe(r, { childList: true, subtree: true, characterData: true,
                            attributes: true, attributeFilter: ['class', 'style', 'src', 'hidden'] });
    });
    // Signature images and late assets change heights without a mutation.
    document.addEventListener('load', function (e) {
      if (e.target.tagName === 'IMG' && e.target.closest('.sheet')) schedule();
    }, true);
    // Print must never catch a stale layout. (While editing, template-tools.js's
    // own beforeprint handler exits edit mode, which re-paginates.)
    window.addEventListener('beforeprint', function () {
      if (editing) return;
      clearTimeout(timer);
      timer = null;
      paginate();
    });
    window.addEventListener('resize', function () { if (editing) schedule(); });
    paginate();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(paginate);
  }

  window.LPR_FLOW = {
    paginate: paginate,
    unpaginate: unpaginate,
    flush: flush,
    hold: hold,
    insertBreak: insertBreak,
    setEditing: setEditing
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
