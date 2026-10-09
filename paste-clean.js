/* ============================================================
   LPR Clean Paste  —  paste-clean.js
   ------------------------------------------------------------
   While editing any template, Ctrl+V pastes CLEAN content:

     kept     paragraphs, headings, bold / italic / underline,
              numbered + bulleted lists (nesting kept), line breaks,
              simple tables
     dropped  the source's fonts, sizes, colours, spacing, classes,
              links (text kept), images, Word/Docs markup

   so pasted text takes the template's own brand styling (see
   style-guide.html). Plain-text pastes understand simple Markdown
   (what AI tools write): # headings, **bold**, *italic*, 1. / -
   lists, indentation for nesting.

   Where it lands: a single paragraph pastes inline at the caret.
   Several paragraphs paste as blocks in the letter body (.lh-body) —
   never inside the date line, recipient block, sign-off or tenant
   signature lines (they go after / before those instead). Outside a
   letter body, blocks are flattened to lines.

   Uses the browser's insertHTML so Ctrl+Z undoes a paste.
   Loaded by template-tools.js at start-up (window.LPR_PASTE).
   Hook for field keys: window.LPR_PASTE.transforms (fn(html) → html).
   ============================================================ */
(function () {
  'use strict';

  var esc = window.LPR_UTIL.esc;
  var KEEP_BLOCK = { P: 'p', H1: 'h1', H2: 'h2', H3: 'h3', H4: 'h4', H5: 'h5', H6: 'h6', OL: 'ol', UL: 'ul', LI: 'li',
                     BLOCKQUOTE: 'blockquote', TABLE: 'table', THEAD: 'thead', TBODY: 'tbody', TR: 'tr', TD: 'td', TH: 'th' };
  var FORMAT = { B: 'b', STRONG: 'b', I: 'i', EM: 'i', U: 'u' };
  var DROP = /^(SCRIPT|STYLE|META|LINK|TITLE|HEAD|IMG|SVG|PICTURE|VIDEO|AUDIO|IFRAME|OBJECT|EMBED|CANVAS|INPUT|BUTTON|SELECT|TEXTAREA|NOSCRIPT|TEMPLATE)$/;
  var CONTAINER = /^(DIV|SECTION|ARTICLE|HEADER|FOOTER|MAIN|ASIDE|NAV|FIGURE|CENTER|FORM)$/;
  var BLOCK_TAG = /^(P|H[1-6]|OL|UL|LI|BLOCKQUOTE|TABLE|THEAD|TBODY|TR|TD|TH)$/;

  /* ================================================================
     HTML → clean HTML
     ================================================================ */
  function styleFlags(el) {
    var st = (el.getAttribute && el.getAttribute('style')) || '';
    var w = /font-weight\s*:\s*([^;]+)/i.exec(st);
    return {
      bold: w ? /bold|[6-9]00/.test(w[1]) : null,
      notBold: w ? /normal|[1-4]00/.test(w[1]) : false,
      italic: /font-style\s*:\s*italic/i.test(st),
      underline: /text-decoration[^;]*underline/i.test(st)
    };
  }

  function cleanChildren(src, out) {
    [].forEach.call(src.childNodes, function (n) { cleanNode(n, out); });
  }

  function cleanNode(n, out) {
    if (n.nodeType === 3) {
      var t = n.data.replace(/[\r\n\t]+/g, ' ').replace(/ /g, ' ');
      if (t) out.appendChild(document.createTextNode(t));
      return;
    }
    if (n.nodeType !== 1) return;                                   // comments, Word conditionals
    var tag = n.tagName.toUpperCase();
    if (DROP.test(tag) || /:/.test(n.tagName)) return;             // <o:p>, <w:…>
    if (tag === 'BR') { out.appendChild(document.createElement('br')); return; }
    var f = styleFlags(n);
    var target = out;
    if (KEEP_BLOCK[tag]) {
      var el = document.createElement(KEEP_BLOCK[tag]);
      if (tag === 'OL' && /^\d+$/.test(n.getAttribute('start') || '')) el.setAttribute('start', n.getAttribute('start'));
      if ((tag === 'TD' || tag === 'TH') && /^\d+$/.test(n.getAttribute('colspan') || '')) el.setAttribute('colspan', n.getAttribute('colspan'));
      out.appendChild(el);
      target = el;
    } else if (CONTAINER.test(tag)) {
      // a <div> of text is a paragraph; a <div> of blocks is just a wrapper
      var hasBlocks = [].some.call(n.children, function (c) { return BLOCK_TAG.test(c.tagName.toUpperCase()) || CONTAINER.test(c.tagName.toUpperCase()); });
      if (!hasBlocks) { var p = document.createElement('p'); out.appendChild(p); target = p; }
    }
    // inline formatting: tags, or the style a span/paragraph carries
    var wraps = [];
    if (FORMAT[tag] && !(FORMAT[tag] === 'b' && f.notBold)) wraps.push(FORMAT[tag]);
    if (f.bold && wraps.indexOf('b') < 0 && !/^H[1-6]$/.test(tag)) wraps.push('b');
    if (f.italic && wraps.indexOf('i') < 0) wraps.push('i');
    if (f.underline && wraps.indexOf('u') < 0) wraps.push('u');
    wraps.forEach(function (w) { var e = document.createElement(w); target.appendChild(e); target = e; });
    cleanChildren(n, target);
  }

  function isBlank(el) {
    return !el.textContent.replace(/ /g, ' ').trim() && !el.querySelector('br + br, td, th, li');
  }

  // Tidy: inline runs at top level / mixed into list items become
  // paragraphs; empty paragraphs and formatting wrappers disappear.
  function tidy(root) {
    root.querySelectorAll('b, i, u').forEach(function (e) { if (!e.textContent.trim() && !e.querySelector('br')) unwrapEl(e); });
    root.querySelectorAll('p, h1, h2, h3, h4, h5, h6').forEach(function (e) { if (isBlank(e)) e.remove(); });
    // paragraphs nested inside paragraphs (Word) → flatten
    root.querySelectorAll('p p, h1 p, h2 p, h3 p, h4 p, h5 p, h6 p').forEach(unwrapEl);
    // a list item holding a single paragraph is just text
    root.querySelectorAll('li').forEach(function (li) {
      var kids = [].filter.call(li.childNodes, function (c) { return c.nodeType === 1 || c.data.trim(); });
      if (kids.length === 1 && kids[0].nodeType === 1 && kids[0].tagName === 'P') unwrapEl(kids[0]);
    });
    // top-level inline runs → paragraphs
    var run = null;
    [].slice.call(root.childNodes).forEach(function (c) {
      var inline = c.nodeType === 3 ? !!c.data.trim() : !BLOCK_TAG.test(c.tagName);
      if (c.nodeType === 3 && !c.data.trim()) { if (run) run.appendChild(c); else c.remove(); return; }
      if (inline) { if (!run) { run = document.createElement('p'); c.before(run); } run.appendChild(c); }
      else run = null;
    });
    // leading/trailing <br> in a paragraph
    root.querySelectorAll('p').forEach(function (p) {
      while (p.firstChild && p.firstChild.nodeName === 'BR') p.firstChild.remove();
      while (p.lastChild && p.lastChild.nodeName === 'BR') p.lastChild.remove();
    });
  }

  function unwrapEl(e) { while (e.firstChild) e.parentNode.insertBefore(e.firstChild, e); e.remove(); }

  function fromHtml(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var root = document.createElement('div');
    cleanChildren(doc.body, root);
    tidy(root);
    return root;
  }

  /* ================================================================
     Plain text (+ simple Markdown) → clean HTML
     ================================================================ */
  function inlineMd(s) {
    s = esc(s);
    s = s.replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, '<b>$1</b>').replace(/__(?=\S)([\s\S]*?\S)__/g, '<b>$1</b>');
    s = s.replace(/(^|[^\w*])\*(?=\S)([^*]*?\S)\*(?!\w)/g, '$1<i>$2</i>').replace(/(^|[^\w])_(?=\S)([^_]*?\S)_(?!\w)/g, '$1<i>$2</i>');
    return s;
  }

  function fromText(text) {
    var root = document.createElement('div');
    var lines = text.replace(/\r\n?/g, '\n').split('\n');
    var stack = [];          // open lists: { el, indent, type }
    function closeLists(indent) {
      while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    }
    function lastLi() { var top = stack[stack.length - 1]; return top && top.el.lastElementChild; }
    lines.forEach(function (raw) {
      if (!raw.trim()) return;                                       // blank lines only separate
      var indent = raw.replace(/\t/g, '    ').match(/^ */)[0].length;
      var line = raw.trim();
      var h = /^(#{1,6})\s+(.*)$/.exec(line);
      var ol = /^(\d+)[.)]\s+(.*)$/.exec(line);
      var ul = /^[-*•]\s+(.*)$/.exec(line);
      if (h) {
        stack = [];
        var he = document.createElement('h' + h[1].length);
        he.innerHTML = inlineMd(h[2]);
        root.appendChild(he);
      } else if (ol || ul) {
        var type = ol ? 'ol' : 'ul';
        closeLists(indent + 1);
        var top = stack[stack.length - 1];
        if (!top || top.indent < indent || top.type !== type) {
          if (top && top.indent === indent && top.type !== type) stack.pop();
          var list = document.createElement(type);
          if (ol && ol[1] !== '1' && (!top || top.indent < indent)) list.setAttribute('start', ol[1]);
          var parent = stack.length ? lastLi() : null;
          (parent || root).appendChild(list);
          stack.push({ el: list, indent: indent, type: type });
          top = stack[stack.length - 1];
        }
        var li = document.createElement('li');
        li.innerHTML = inlineMd(ol ? ol[2] : ul[1]);
        top.el.appendChild(li);
      } else if (stack.length && indent > 0 && lastLi()) {
        // an indented plain line continues the open list item
        var p = document.createElement('p');
        p.innerHTML = inlineMd(line);
        lastLi().appendChild(p);
      } else {
        stack = [];
        var para = document.createElement('p');
        para.innerHTML = inlineMd(line);
        root.appendChild(para);
      }
    });
    return root;
  }

  /* ================================================================
     Inserting
     ================================================================ */
  // Structural blocks a paste must never land inside.
  var AFTER_SEL = '.date, .recipient, .info-grid, .callout, .legal, table, [data-flow-keep]';
  var BEFORE_SEL = '.signoff, .sig-block';

  function elementOf(node) { return node.nodeType === 1 ? node : node.parentElement; }

  function placeCaretIn(el) {
    var r = document.createRange();
    r.selectNodeContents(el);
    r.collapse(true);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
  }

  // A <span style> whose every declaration matches what it inherits anyway
  // changes nothing — Chrome adds these when splitting a paragraph. Only the
  // style attribute is removed (the span stays), so Ctrl+Z can still take
  // the pasted text out cleanly.
  function dropRedundantSpanStyles(scope) {
    scope.querySelectorAll('span[style]').forEach(function (sp) {
      if (sp.attributes.length !== 1 || !sp.parentElement) return;
      var mine = getComputedStyle(sp), theirs = getComputedStyle(sp.parentElement);
      for (var i = 0; i < sp.style.length; i++) {
        var prop = sp.style[i];
        if (mine.getPropertyValue(prop) !== theirs.getPropertyValue(prop)) return;
      }
      sp.removeAttribute('style');
    });
  }

  // A highlighted range is replaced exactly — fields included (the browser
  // deletes locked field chips itself, and Undo brings them back) — but it
  // is trimmed to the letter body, so the letterhead, sign-off and tenant
  // signature lines are never replaced (e.g. after Ctrl+A).
  // The last caret position INSIDE el. A position merely "before the
  // sign-off" would be snapped by the browser into the sign-off, which then
  // gets merged into the paste ("…Sincerely,").
  function endInside(el) {
    var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), n, last = null;
    while ((n = w.nextNode())) if (n.data.length) last = n;
    if (last && !last.parentElement.closest(window.LPR_UTIL.TOKEN_SEL)) return [last, last.data.length];
    return [el, el.childNodes.length];          // ends with a field chip, or no text
  }

  function clampToBody(range, body) {
    var r = range.cloneRange();
    if (!body.contains(r.startContainer)) r.setStart(body, 0);
    var prot = [].find.call(body.children, function (c) { return c.matches(BEFORE_SEL); });
    if (prot && r.intersectsNode(prot)) {
      var prev = prot.previousElementSibling;
      if (!prev || prot.contains(r.startContainer) || r.comparePoint(prot, 0) < 0) { r.setStartBefore(prot); r.collapse(true); }
      else { var end = endInside(prev); r.setEnd(end[0], end[1]); }
    }
    if (!body.contains(r.endContainer) && !r.collapsed) r.setEnd(body, prot ? [].indexOf.call(body.childNodes, prot) : body.childNodes.length);
    return r;
  }

  // When a highlight starts in the date line or recipient block, Chrome
  // merges what's left of the last paragraph into (a copy of) that block.
  // A date / recipient block left with no fields is now plain text, so it
  // loses its date / address styling (an empty one too — Clear all leaves
  // the caret line in a copy of the date block); Undo puts the styling
  // back, Redo takes it off again.
  var stripped = [];
  function unstyleEmptiedBlocks(body) {
    [].forEach.call(body.children, function (b) {
      if (!b.matches('.date, .recipient') || b.querySelector(window.LPR_UTIL.TOKEN_SEL)) return;
      stripped.push({ el: b, cls: b.className });
      b.className = '';
    });
  }
  document.addEventListener('input', function (e) {
    if (!/^history(Undo|Redo)$/.test(e.inputType || '')) return;
    if (e.inputType === 'historyRedo') {
      document.querySelectorAll('.sheet.tt-editing .lh-body').forEach(unstyleEmptiedBlocks);
      return;
    }
    stripped = stripped.filter(function (x) {
      if (!x.el.isConnected) return false;
      if (x.el.querySelector(window.LPR_UTIL.TOKEN_SEL)) { x.el.className = x.cls; return false; }
      return true;
    });
  }, true);

  function insert(root, range) {
    var blocks = [].filter.call(root.children, function (c) { return BLOCK_TAG.test(c.tagName); });
    var single = root.childNodes.length === 1 && root.firstChild.nodeName === 'P';
    var at = elementOf(range.startContainer);
    var body = (at && at.closest('.lh-body')) || (elementOf(range.endContainer) || document.body).closest('.lh-body');
    if (!body && !range.collapsed) {
      // e.g. Ctrl+A: both ends outside the letter body, but the body is in the selection
      var sheet = (at && at.closest('.sheet')) || elementOf(range.endContainer).closest('.sheet');
      var b = sheet && sheet.querySelector('.lh-body');
      if (b && range.intersectsNode(b)) body = b;
    }
    var sel = window.getSelection();
    if (body && !range.collapsed) {
      range = clampToBody(range, body);
      sel.removeAllRanges();
      sel.addRange(range);
      at = elementOf(range.startContainer);
    }
    var replacing = !range.collapsed;
    var html;
    if (!blocks.length || single) {
      html = single ? root.firstChild.innerHTML : root.innerHTML;    // one paragraph → inline at the caret
    } else if (!body) {
      // not a letter body (labels, cards, a table cell…): lines, not blocks
      html = [].map.call(root.children, function (b) {
        if (/^(OL|UL)$/.test(b.tagName)) return [].map.call(b.children, function (li, i) { return (b.tagName === 'OL' ? (i + 1) + '. ' : '• ') + li.innerHTML; }).join('<br>');
        return b.innerHTML;
      }).join('<br>');
    } else {
      html = root.innerHTML;
      if (!replacing) {
        // Only a bare caret is moved: a highlight is replaced where it is.
        var top = at;
        while (top && top.parentElement !== body) top = top.parentElement;
        var anchor = null, where = null;
        if (top && top.matches(BEFORE_SEL)) { anchor = body.querySelector(BEFORE_SEL); where = 'before'; }
        else if (top && top.matches(AFTER_SEL)) { anchor = top; where = 'after'; }
        else if (!top && range.startContainer === body) {           // caret between blocks
          var nextBlock = body.childNodes[range.startOffset];
          if (nextBlock && nextBlock.nodeType === 1 && nextBlock.matches(BEFORE_SEL)) { anchor = nextBlock; where = 'before'; }
        }
        if (anchor) {
          var p = document.createElement('p');
          p.appendChild(document.createElement('br'));
          anchor[where](p);
          placeCaretIn(p);
        } else if (top && !top.textContent.trim() && !top.querySelector(window.LPR_UTIL.TOKEN_SEL) && /^(P|DIV)$/.test(top.tagName)) {
          placeCaretIn(top);                                         // empty line: fill it
        }
        // else: inside a paragraph — insertHTML splits it like a word processor
      }
    }
    // Fields inside a pasted-over highlight are removed on purpose — not the
    // accidental loss the Done warning is for.
    if (replacing && window.LPR_EDIT_UNDO && window.LPR_EDIT_UNDO.noteDeliberateRemoval) window.LPR_EDIT_UNDO.noteDeliberateRemoval(range);
    document.execCommand('insertHTML', false, html);
    if (body && replacing) unstyleEmptiedBlocks(body);
    dropRedundantSpanStyles(body || (at && at.closest('.sheet')) || document.body);
  }

  function onPaste(e) {
    var at = e.target && elementOf(e.target);
    var sheet = at && at.closest('.sheet.tt-editing');
    if (!sheet || !e.clipboardData) return;
    var html = e.clipboardData.getData('text/html');
    var text = e.clipboardData.getData('text/plain');
    if (!html && !text) return;                                      // e.g. an image — leave to the browser
    e.preventDefault();
    var root = html ? fromHtml(html) : fromText(text);
    var out = root.innerHTML;
    window.LPR_PASTE.transforms.forEach(function (fn) { out = fn(out); });
    root.innerHTML = out;
    var sel = window.getSelection();
    if (!sel.rangeCount) return;
    insert(root, sel.getRangeAt(0));
  }

  document.addEventListener('paste', onPaste, true);

  // Clear body (keeps the date + recipient) / Clear all (removes those too).
  // Everything up to the sign-off goes; the letterhead, sign-off and tenant
  // signature lines are never touched. One native delete, so one Ctrl+Z
  // brings it all back, and the removed fields count as deliberate (no
  // warning on Done). Leaves one empty line with the caret, ready to paste.
  function clear(all) {
    var sheet = [].find.call(document.querySelectorAll('.sheet[data-flow].tt-editing'), function (s) { return s.offsetHeight > 0; });
    var body = sheet && sheet.querySelector('.lh-body');
    if (!body) return false;
    var prot = [].find.call(body.children, function (c) { return c.matches(BEFORE_SEL); });
    var kids = [].slice.call(body.children, 0, prot ? [].indexOf.call(body.children, prot) : undefined);
    var keep = all ? -1 : Math.max(kids.findIndex(function (c) { return c.matches('.recipient'); }),
                                   kids.findIndex(function (c) { return c.matches('.date'); }));
    var gone = kids.slice(keep + 1);
    sheet.focus();
    if (!gone.length) {                                  // nothing left to clear: just give a line to type on
      var p = document.createElement('p');
      p.appendChild(document.createElement('br'));
      (prot ? prot.before(p) : body.appendChild(p));
      placeCaretIn(p);
      return true;
    }
    var r = document.createRange();
    r.setStart(gone[0], 0);
    var end = endInside(gone[gone.length - 1]);
    r.setEnd(end[0], end[1]);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
    if (window.LPR_EDIT_UNDO && window.LPR_EDIT_UNDO.noteDeliberateRemoval) window.LPR_EDIT_UNDO.noteDeliberateRemoval(r);
    document.execCommand('delete', false, null);
    unstyleEmptiedBlocks(body);
    return true;
  }

  window.LPR_PASTE = {
    clear: clear,
    fromHtml: function (h) { return fromHtml(h).innerHTML; },
    fromText: function (t) { return fromText(t).innerHTML; },
    transforms: []          // field keys (Phase 3) register here
  };
})();
