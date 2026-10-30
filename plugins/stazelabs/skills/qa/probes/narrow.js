// /stazelabs:qa Pass P: narrow-viewport measurement probe. Breakpoints are Tailwind's defaults (sm 640, md 768, lg 1024).
//
// Paste the whole file into `mcp__claude-in-chrome__javascript_tool`. It is one
// expression (an IIFE), so the REPL returns its value — do not add `return` at
// the top level and do not split it up.
//
// It MEASURES; it does not convict. Every entry it reports is a place to look,
// and a finding needs the on-screen confirmation plus the file:line trace that
// SKILL.md §5 requires. Several categories below are *expected* to be non-empty
// on a correct page — each one says so.
(() => {
  const CAP = 20;
  const cap = (a) => a.slice(0, CAP);
  const vw = document.documentElement.clientWidth;

  // Compact, human-readable selector: tag + #id + first two classes.
  // NOTE: classes are joined with SPACES, never dots. A dot-joined
  // `tag.class.class` string looks like a JWT to the browser tool's secret
  // scanner, which redacts the whole value to "[BLOCKED: JWT token]" and makes
  // the output useless. Measured 2026-08-21 — do not "tidy" this back to CSS
  // selector syntax.
  const sel = (el) => {
    if (!el || !el.tagName) return String(el);
    const cls = (el.className && typeof el.className === 'string' ? el.className : '')
      .split(/\s+/).filter(Boolean).slice(0, 3).join(' ');
    return el.tagName.toLowerCase() + (el.id ? ' #' + el.id : '') + (cls ? ' [' + cls + ']' : '');
  };
  const visible = (el) => el.offsetParent !== null || getComputedStyle(el).position === 'fixed';
  const text = (el) => (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);

  // An element that overflows *inside* an overflow-x container is correct
  // (a table scrolls in its own wrapper, never the page body).
  const scrollParent = (el) => {
    for (let p = el.parentElement; p; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX;
      if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') return sel(p) + ' [overflow-x:' + ox + ']';
    }
    return null;
  };

  const all = Array.from(document.querySelectorAll('body *')).filter(visible);

  // 1. Viewport truth. `resize_window` sizes the WINDOW, honours width but not
  //    height, floors somewhere below 580 CSS px, and WEDGES the window if you ask for
  //    less (see SKILL.md, Pass P). `outerWidth`/`outerHeight` read 0 in this
  //    execution context, so inner/client plus matchMedia is the only truth
  //    about what actually rendered. Always read `mq` before believing a pass.
  const viewport = {
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    clientWidth: vw,
    devicePixelRatio: window.devicePixelRatio,
    visibility: document.visibilityState,
    breakpoint: vw < 640 ? '<sm' : vw < 768 ? 'sm' : vw < 1024 ? 'md' : 'lg+',
    // Ground truth for which Tailwind rules are actually live.
    mq: { sm: matchMedia('(min-width: 640px)').matches, md: matchMedia('(min-width: 768px)').matches, lg: matchMedia('(min-width: 1024px)').matches },
  };

  // 2. Horizontal overflow. `culprits` is what to look at; anything with a
  //    `containedBy` is the SANCTIONED case, not a defect.
  const de = document.documentElement;
  const culprits = [];
  let offscreenLeft = 0;
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    // Parked entirely off the left edge = a closed drawer/panel
    // (`-translate-x-full`), which is the design, not an overflow.
    if (r.right <= 0) { offscreenLeft++; continue; }
    if (r.right > vw + 1 || r.left < -1) {
      culprits.push({ el: sel(el), text: text(el), left: Math.round(r.left), right: Math.round(r.right), containedBy: scrollParent(el) });
    }
  }
  const bodyOverflow = {
    overflowing: de.scrollWidth > de.clientWidth + 1,
    scrollWidth: de.scrollWidth,
    clientWidth: de.clientWidth,
    // Culprits with containedBy === null are the ones that can break the body.
    culprits: cap(culprits.filter((c) => !c.containedBy)),
    containedCount: culprits.filter((c) => c.containedBy).length,
    offscreenLeftCount: offscreenLeft,
  };

  // 3. Column-priority parity. A `hidden {bp}:table-cell` applied to
  //    a <th> but not its matching <td> (or vice versa) misaligns the table and
  //    looks plausible in a screenshot. Compare VISIBLE cell counts per row.
  const tableColumns = cap(Array.from(document.querySelectorAll('table')).filter(visible).map((t, i) => {
    const head = Array.from(t.querySelectorAll('thead th, thead td'));
    const headVisible = head.filter(visible).length;
    const rows = Array.from(t.querySelectorAll('tbody tr')).filter(visible);
    const mismatched = [];
    rows.forEach((row, ri) => {
      const cells = Array.from(row.children).filter((c) => /^(TD|TH)$/.test(c.tagName));
      // A colspan'd expand/footer row legitimately has one wide cell.
      const spanned = cells.some((c) => (c.colSpan || 1) > 1);
      const n = cells.filter(visible).length;
      if (!spanned && n !== headVisible) mismatched.push({ row: ri, visibleCells: n, firstCell: text(cells[0] || row) });
    });
    return { table: i, sel: sel(t), headerVisibleCols: headVisible, rows: rows.length, mismatched: cap(mismatched) };
  }).filter((t) => t.mismatched.length > 0 || t.headerVisibleCols === 0));

  // 4. Tap targets. Threshold is 24px, NOT 44. See SKILL.md's non-findings:
  //    the finding is crowding or unhittability, never the number alone.
  const controls = Array.from(document.querySelectorAll('a[href], button, [role="button"], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])'))
    .filter(visible)
    .map((el) => ({ el, r: el.getBoundingClientRect() }))
    .filter((c) => c.r.width > 0 && c.r.height > 0);
  // BOTH dimensions must be small: a 95x15 text link is a link, not a tap
  // target problem. What this is hunting is the icon-sized control.
  const small = (r) => r.width < 24 && r.height < 24;
  const tiny = controls
    .filter((c) => small(c.r) && c.el.type !== 'hidden' && !/(^|\s)sr-only(\s|$)/.test(typeof c.el.className === 'string' ? c.el.className : ''))
    .map((c) => ({ el: sel(c.el), text: text(c.el), w: Math.round(c.r.width), h: Math.round(c.r.height) }));
  const crowded = [];
  for (let i = 0; i < controls.length; i++) {
    for (let j = i + 1; j < controls.length; j++) {
      const a = controls[i].r, b = controls[j].r;
      if (controls[i].el.contains(controls[j].el) || controls[j].el.contains(controls[i].el)) continue;
      const dx = Math.max(0, Math.max(a.left, b.left) - Math.min(a.right, b.right));
      const dy = Math.max(0, Math.max(a.top, b.top) - Math.min(a.bottom, b.bottom));
      const overlapX = a.left < b.right && b.left < a.right;
      const overlapY = a.top < b.bottom && b.top < a.bottom;
      // Two roomy controls sitting 2px apart are a normal inline row. Only
      // flag crowding when at least one of the pair is already small, or when
      // they genuinely overlap.
      const near = (overlapY && dx < 4) || (overlapX && dy < 4);
      if (overlapX && overlapY) crowded.push({ a: sel(controls[i].el), b: sel(controls[j].el), gap: 'overlapping' });
      else if (near && (small(a) || small(b))) crowded.push({ a: sel(controls[i].el), b: sel(controls[j].el), gap: Math.round(overlapY ? dx : dy) });
    }
    if (crowded.length > CAP) break;
  }
  const tapTargets = { under24: cap(tiny), crowded: cap(crowded) };

  // 5. Hover-only reveals. Hover-reveal controls are invisible on touch and
  //    until focus. Decorative group-hover: color shifts are fine, so this list
  //    should normally be EMPTY. A non-empty result is a place to look.
  const hoverOnly = cap(all
    .filter((el) => {
      const cls = typeof el.className === 'string' ? el.className : '';
      if (!/(^|\s)(group-hover:|hover:)/.test(cls)) return false;
      const hidesAtRest = /(^|\s)(opacity-0|invisible)(\s|$)/.test(cls);
      const revealsOnHover = /(group-hover:|hover:)(opacity-100|visible|flex|block|inline-flex)/.test(cls);
      return hidesAtRest && revealsOnHover;
    })
    .map((el) => ({ el: sel(el), text: text(el), interactive: !!el.closest('a,button,[role="button"]') || !!el.querySelector('a,button,[role="button"]') })));

  // 6. iOS anti-zoom rule (check the project CSS for a sub-sm 16px rule).
  //    Below 640 a focused control under 16px makes iOS Safari zoom the page.
  const inputFontSize = vw >= 640 ? 'n/a above sm' : cap(Array.from(document.querySelectorAll('input, select, textarea'))
    .filter((el) => visible(el) && el.type !== 'hidden')
    .map((el) => ({ el: sel(el), fontSize: getComputedStyle(el).fontSize }))
    .filter((x) => parseFloat(x.fontSize) < 16));

  // 7. Sticky chrome. A topbar that stops sticking, or overlaps content, at
  //    narrow width. `main` offset is reported so an overlap is visible as a
  //    negative gap.
  const bar = document.querySelector('header, [class*="sticky"]');
  const main = document.getElementById('main');
  const stickyChrome = bar ? {
    el: sel(bar),
    position: getComputedStyle(bar).position,
    rect: (({ top, height, width }) => ({ top: Math.round(top), height: Math.round(height), width: Math.round(width) }))(bar.getBoundingClientRect()),
    mainTop: main ? Math.round(main.getBoundingClientRect().top) : null,
  } : null;

  return { url: location.pathname, viewport, bodyOverflow, tableColumns, tapTargets, hoverOnly, inputFontSize, stickyChrome };
})()
