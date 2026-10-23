#!/usr/bin/env node
// Audit: total top spacing inside every ConvexDialog.Content - from the
// dialog's own padding edge to the first element that paints pixels, and for
// header dialogs the gap between the DialogHeader banner and the next content.
//
// Static analyzer: parses each .tsx with @babel/parser, walks the JSX of
// every <ConvexDialog.Content>, and sums pt/p/mt tokens on the first-child
// chain until a "visible" element (bg-*, border, text, or an opaque custom
// component). gap-* between siblings does not pad a first child, but the gap
// of the element CONTAINING the DialogHeader does add to the header gap.
// Responsive variants (sm:/md:/...) count - web dialogs render at sm+ widths.
// DialogHeader bleeds -mt-5 -mx-5 to the frame's p-5 edge, so it always sits
// flush at the top; what it contributes below itself is its mb.
//
//   node scripts/audit-dialog-padding.mjs [--json] [--fix]
import { parse } from '@babel/parser';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const DIRS = ['components', 'app', 'script'];
const HEADER_MB_PX = 12; // DialogHeader mb-3
const FRAME_PX = 20; // web DialogGuildedFrame contentClassName p-5

const VARIANT = /^(?:sm|md|lg|xl|2xl):/;

const px = (token) => {
  const bare = token.replace(VARIANT, '');
  const m = bare.match(
    /^(-?)(?:p[trblxy]?|m[trblxy]|gap|gap-[xy])-(?:\[(\d+(?:\.\d+)?)(px)?\]|(\d+(?:\.\d+)?))$/
  );
  if (!m) return null;
  const sign = m[1] === '-' ? -1 : 1;
  if (m[2] !== undefined) return sign * (m[3] === 'px' ? parseFloat(m[2]) : parseFloat(m[2]) * 4);
  return sign * parseFloat(m[4]) * 4;
};

const TOP_SIDE = /^-?(?:p|py|pt|m|my|mt)-/;
const NON_TOP_SIDE = /^-?(?:pl|pr|pb|px|ml|mr|mb|mx)-/;
const BOT_SIDE = /^-?(?:p|py|pb|m|my|mb)-/;
const NON_BOT_SIDE = /^-?(?:pl|pr|pt|px|ml|mr|mt|mx)-/;

/** Same shape as topTokens but for the bottom edge - used to measure how
 *  much room an element that renders INVISIBLY still occupies before the
 *  next sibling (its own top+bottom pad). */
const botTokens = (cls) => {
  let total = 0;
  const parts = [];
  for (const tok of cls.split(/\s+/).filter(Boolean)) {
    const bare = tok.replace(VARIANT, '');
    if (NON_BOT_SIDE.test(bare) || !BOT_SIDE.test(bare)) continue;
    const v = px(tok);
    if (v !== null && v !== 0) {
      total += v;
      parts.push(tok);
    }
  }
  return { total, parts };
};

const topTokens = (cls) => {
  let total = 0;
  const parts = [];
  for (const tok of cls.split(/\s+/).filter(Boolean)) {
    const bare = tok.replace(VARIANT, '');
    if (NON_TOP_SIDE.test(bare) || !TOP_SIDE.test(bare)) continue;
    const v = px(tok);
    if (v !== null && v !== 0) {
      total += v;
      parts.push(tok);
    }
  }
  return { total, parts };
};

const hasClass = (cls, re) => cls.split(/\s+/).some((t) => re.test(t));

/** Vertical gap between a container's children: gap-/gap-y- on column-ish
 *  containers (Row / flex-row makes gap horizontal, which doesn't apply). */
const vgapTokens = (name, cls) => {
  if (name === 'Row' || hasClass(cls, /^flex-row$/)) return { total: 0, parts: [] };
  let total = 0;
  const parts = [];
  for (const tok of cls.split(/\s+/).filter(Boolean)) {
    const bare = tok.replace(VARIANT, '');
    if (!/^gap(-y)?-/.test(bare) || /^gap-x-/.test(bare)) continue;
    const v = px(tok);
    if (v !== null && v !== 0) {
      total += v;
      parts.push(tok);
    }
  }
  return { total, parts };
};

const classNameAttr = (node) => {
  const attr = node.openingElement?.attributes?.find(
    (a) => a.type === 'JSXAttribute' && a.name?.name === 'className'
  );
  if (!attr) return { text: '', attr: null };
  const v = attr.value;
  if (!v) return { text: '', attr };
  if (v.type === 'StringLiteral') return { text: v.value, attr };
  if (v.type === 'JSXExpressionContainer') return { text: staticParts(v.expression), attr };
  return { text: '', attr };
};
const classNameOf = (node) => classNameAttr(node).text;

const staticParts = (expr) => {
  if (!expr) return '';
  if (expr.type === 'StringLiteral') return expr.value;
  if (expr.type === 'TemplateLiteral') {
    return expr.quasis.map((q) => q.value.cooked ?? '').join(' ');
  }
  if (expr.type === 'BinaryExpression' && expr.operator === '+') {
    return `${staticParts(expr.left)} ${staticParts(expr.right)}`;
  }
  if (expr.type === 'CallExpression') {
    return expr.arguments.map(staticParts).join(' ');
  }
  if (expr.type === 'ConditionalExpression') {
    return `${staticParts(expr.consequent)} ${staticParts(expr.alternate)}`;
  }
  if (expr.type === 'LogicalExpression') {
    return `${staticParts(expr.left)} ${staticParts(expr.right)}`;
  }
  return '';
};

const nameOf = (node) => {
  const n = node.openingElement?.name;
  if (!n) return '';
  if (n.type === 'JSXIdentifier') return n.name;
  if (n.type === 'JSXMemberExpression') {
    return `${n.object.name}.${n.property.name}`;
  }
  return '';
};

const VISIBLE_CLASS = /^(bg-(?!transparent|black\/0)|border(?!-subtle-border$|-transparent)|shadow-)/;
const VISIBLE_NAME = new Set([
  'FontText',
  'Text',
  'AppButton',
  'FontTextInput',
  'TextInput',
  'Image',
  'Svg',
  'DialogHeader',
]);
const LAYOUT_NAME = new Set([
  'View',
  'Column',
  'Row',
  'ScrollView',
  'ShadowScrollView',
  'SafeAreaView',
  'Fragment',
]);
const NONFLOW_NAMES = new Set([
  'CloseButton',
  'MinimizeButton',
  'SaveHistoryPill',
  'UnsavedChangesDialog',
]);
const NONFLOW = (name, cls) =>
  NONFLOW_NAMES.has(name) || hasClass(cls, /^(absolute|fixed|hidden$)/);

/** Elements unwrapped out of a conditional ({cond && <X/>}, {cond ? <X/> : null})
 *  are not guaranteed to render. MAYBE marks JSX nodes that came from a
 *  conditional right side so sibling scans can skip past them. */
const MAYBE = new WeakSet();

/** Unwrap {cond && <X/>} and fragments; keep {cond ? A : B} as a choice node. */
const unwrapChildren = (children, out = [], maybe = false) => {
  for (const child of children ?? []) {
    if (!child) continue;
    if (child.type === 'JSXText') {
      if (child.value.trim()) out.push({ kind: 'text' });
      continue;
    }
    if (child.type === 'JSXFragment') {
      unwrapChildren(child.children, out, maybe);
      continue;
    }
    if (child.type === 'JSXElement') {
      if (maybe) MAYBE.add(child);
      out.push(child);
      continue;
    }
    if (child.type === 'ConditionalExpression') {
      out.push({
        kind: 'choice',
        alts: [
          unwrapChildren([child.consequent], [], maybe),
          unwrapChildren([child.alternate], [], maybe),
        ],
      });
      continue;
    }
    if (child.type === 'LogicalExpression' && child.operator === '&&') {
      unwrapChildren([child.right], out, true);
      continue;
    }
    if (child.type === 'NullLiteral' || child.type === 'BooleanLiteral') continue;
    if (child.type === 'StringLiteral') {
      if (child.value.trim()) out.push({ kind: 'text' });
      continue;
    }
    if (child.type === 'NumericLiteral') {
      out.push({ kind: 'text' });
      continue;
    }
    if (child.type === 'JSXExpressionContainer') {
      const e = child.expression;
      if (!e || e.type === 'JSXEmptyExpression') continue;
      if (e.type === 'LogicalExpression' && e.operator === '&&') {
        unwrapChildren([e.right], out, true);
      } else if (e.type === 'ConditionalExpression') {
        // Alternatives, not siblings: keep grouped so first-paint picks the
        // worst branch instead of the first-written one.
        out.push({
          kind: 'choice',
          alts: [
            unwrapChildren([e.consequent], [], maybe),
            unwrapChildren([e.alternate], [], maybe),
          ],
        });
      } else if (e.type === 'JSXElement' || e.type === 'JSXFragment') {
        unwrapChildren([e], out, maybe);
      } else if (e.type === 'NullLiteral' || e.type === 'BooleanLiteral') {
        continue; // renders nothing
      } else if (e.type === 'StringLiteral') {
        if (e.value.trim()) out.push({ kind: 'text' });
      } else if (e.type === 'NumericLiteral') {
        out.push({ kind: 'text' }); // even 0 paints
      } else {
        out.push({ kind: 'opaque' }); // .map(), calls, variables
      }
    }
  }
  return out;
};

const flowKids = (node) =>
  unwrapChildren(node.children).filter((k) => k.kind || !NONFLOW(nameOf(k), classNameOf(k)));

/**
 * Offset from an element's own top edge to its first painted pixels.
 * Returns { offset, chain, fix, via } where chain is display strings
 * ("pt-4:62") and fix is [{ start, end, toks }] - className value ranges
 * whose tokens pad the top.
 */
const firstPaintOffset = (node, inherited = 0, chain = [], fix = []) => {
  if (!node) return { offset: inherited, chain, fix, via: 'none' };
  if (node.kind === 'text' || node.kind === 'opaque') {
    return { offset: inherited, chain, fix, via: node.kind };
  }
  if (node.kind === 'choice') {
    // Report the worst (max) non-empty alternate; union every alternate's
    // pad tokens so --fix hits all of them.
    let best = { offset: inherited, chain, fix, via: 'empty-alt' };
    const allChains = [];
    const allFix = [...fix];
    for (const alt of node.alts) {
      if (!alt.length) continue;
      const r = firstPaintOffset(alt[0], inherited, chain, fix);
      allChains.push(...r.chain);
      allFix.push(...r.fix);
      if (r.offset > best.offset || best.via === 'empty-alt') best = r;
    }
    return { ...best, allChains: [...new Set(allChains)], fix: dedupeFix(allFix) };
  }
  const name = nameOf(node);
  const { text: cls, attr } = classNameAttr(node);
  if (name === 'DialogHeader') return { offset: inherited, chain, fix, via: 'DialogHeader' };
  if (VISIBLE_NAME.has(name) || hasClass(cls, VISIBLE_CLASS)) {
    return { offset: inherited, chain, fix, via: name };
  }
  if (LAYOUT_NAME.has(name) || hasClass(cls, /^(flex|grid|block|inline)/)) {
    const { total, parts } = topTokens(cls);
    const loc = parts.length ? `:${node.loc?.start.line}` : '';
    const nChain = [...chain, ...parts.map((t) => `${t}${loc}`)];
    const nFix =
      parts.length && attr ? [...fix, { start: attr.value.start, end: attr.value.end, toks: parts }] : fix;
    const kids = flowKids(node);
    if (!kids.length) {
      return { offset: inherited + total, chain: nChain, fix: nFix, via: `${name}(empty)` };
    }
    const g = vgapTokens(name, cls);
    return scanSiblings(kids, inherited + total, nChain, nFix, g);
  }
  if (name === 'Pressable' || name === 'button') {
    const { total, parts } = topTokens(cls);
    const loc = parts.length ? `:${node.loc?.start.line}` : '';
    const nFix =
      parts.length && attr ? [...fix, { start: attr.value.start, end: attr.value.end, toks: parts }] : fix;
    return {
      offset: inherited + total,
      chain: [...chain, ...parts.map((t) => `${t}${loc}`)],
      fix: nFix,
      via: name,
    };
  }
  // Unknown/custom component: opaque, might paint internally.
  return { offset: inherited, chain, fix, via: `${name}?` };
};

const dedupeFix = (fix) => {
  const seen = new Set();
  return fix.filter((f) => {
    const k = `${f.start}:${f.end}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

/** Can this child render NO box at all? (conditional, or ternary with an
 *  empty alternate.) Opaque/.map() stays terminal - unknowable. */
const canBeAbsent = (k) =>
  MAYBE.has(k) || (k.kind === 'choice' && k.alts.some((a) => !a.length));

/** Can this child render a box that paints NOTHING? (empty layout, or a
 *  layout whose whole subtree is absent/invisible.) Visible-named or
 *  visibly-classed elements, text, and opaque/customs always paint. */
const canRenderInvisible = (k, depth = 0) => {
  if (depth > 12) return false;
  if (k.kind === 'text' || k.kind === 'opaque') return false;
  if (k.kind === 'choice')
    return k.alts.every((a) => !a.length || canRenderInvisible(a[0], depth + 1));
  const name = nameOf(k);
  const cls = classNameOf(k);
  if (VISIBLE_NAME.has(name) || hasClass(cls, VISIBLE_CLASS)) return false;
  if (name === 'Pressable' || name === 'button') return false;
  if (LAYOUT_NAME.has(name) || hasClass(cls, /^(flex|grid|block|inline)/)) {
    const kids = flowKids(k);
    if (!kids.length) return true;
    return kids.every((kid) => canBeAbsent(kid) || canRenderInvisible(kid, depth + 1));
  }
  return false; // custom component: assume it paints
};

/** Height an invisible-but-rendered element still occupies before the next
 *  sibling: its own top+bottom pad. */
const ownPadSum = (k) => {
  const cls = classNameOf(k);
  return topTokens(cls).total + botTokens(cls).total;
};

/**
 * Iterate flow siblings left-to-right and return the max-offset
 * first-visible candidate across every render branch. Siblings that can be
 * absent ({cond && <X/>}, ternary-with-null) or that can render an
 * invisible box keep the scan going; invisible boxes contribute their own
 * pad plus the container gap to later candidates.
 */
const scanSiblings = (kids, inherited, chain, fix, sibGap) => {
  let best = null;
  let extra = 0;
  for (const k of kids) {
    const r = firstPaintOffset(k, inherited + extra, chain, fix);
    const paints = r.via && r.via !== 'none' && !/\(empty\)$/.test(r.via) && r.via !== 'empty-alt';
    if (process.env.AUDIT_DEBUG)
      console.error(
        `  kid ${k.loc?.start?.line ?? k.kind} ${nameOf(k)} -> via ${r.via} off ${r.offset}` +
          ` absent=${canBeAbsent(k)} invis=${canRenderInvisible(k)}`
      );
    if (paints && (!best || r.offset > best.offset)) best = r;
    if (!canBeAbsent(k) && !canRenderInvisible(k)) break;
    // Only unconditionally-rendered invisible boxes reliably steal the slot:
    // an absent-able element either renders content (next isn't first) or
    // renders nothing (no box, no gap).
    if (canRenderInvisible(k) && !canBeAbsent(k)) extra += ownPadSum(k) + sibGap.total;
  }
  return best ?? { offset: inherited + extra, chain, fix, via: 'empty' };
};

/** DFS for DialogHeader inside a dialog body. */
const scanForHeader = (children) => {
  for (let i = 0; i < children.length; i++) {
    const k = children[i];
    if (k.kind === 'text' || k.kind === 'opaque') return { painted: true };
    if (k.kind === 'choice') {
      if (!canBeAbsent(k)) return { painted: true };
      continue; // every alt could be empty - the header may be a later sibling
    }
    const name = nameOf(k);
    const cls = classNameOf(k);
    if (name === 'DialogHeader') return { header: [i] };
    const maybe = canBeAbsent(k);
    if (!maybe && (VISIBLE_NAME.has(name) || hasClass(cls, VISIBLE_CLASS))) {
      return { painted: true };
    }
    if (LAYOUT_NAME.has(name) || hasClass(cls, /^(flex|grid|block|inline)/)) {
      const sub = scanForHeader(flowKids(k));
      if (sub?.header) return { header: [i, ...sub.header] };
      if (!maybe && sub?.painted) return sub;
      continue; // empty/maybe wrapper - the header could be a later sibling
    }
    if (maybe || canRenderInvisible(k)) continue;
    return { painted: true }; // opaque custom component
  }
  return null;
};

/** After a header at `path`, find the next flow element's leading offset.
 *  parentGap = the vertical gap of the element containing the header's
 *  siblings at this level - it separates the header from its next sibling. */
const resumeAfterHeader = (children, path, parentGap = { total: 0, parts: [], loc: '' }) => {
  const [i, ...rest] = path;
  const node = children[i];
  if (rest.length) {
    const g = vgapTokens(nameOf(node), classNameOf(node));
    const inner = resumeAfterHeader(flowKids(node), rest, {
      total: g.total,
      parts: g.parts,
      loc: g.parts.length ? `:${node.loc?.start.line}` : '',
    });
    if (inner) return inner;
  }
  const afterKids = children.slice(i + 1);
  if (!afterKids.length) return null;
  const gapChain = parentGap.parts.map((t) => `${t}${parentGap.loc}`);
  const r = scanSiblings(afterKids, parentGap.total, [], [], parentGap);
  return {
    ...r,
    chain: [...gapChain, ...(r.allChains ?? r.chain)],
    gapChain,
  };
};

const analyzeContent = (contentNode, file) => {
  const { text: contentCls, attr: contentAttr } = classNameAttr(contentNode);
  const callerPad = topTokens(contentCls); // outer Dialog.Content padding
  const kids = flowKids(contentNode);
  const result = {
    file,
    callerPadPx: callerPad.total,
    callerPadParts: callerPad.parts,
    callerPadSite:
      callerPad.parts.length && contentAttr
        ? { start: contentAttr.value.start, end: contentAttr.value.end }
        : null,
    loc: contentNode.loc?.start.line,
    hasHeader: false,
    topPadPx: FRAME_PX,
    postHeaderGapPx: null,
    chain: [],
    gapChain: [],
    fix: [],
    via: '',
  };
  if (!kids.length) {
    result.via = 'empty';
    return result;
  }
  const headerPath = scanForHeader(kids)?.header;
  if (headerPath) {
    result.hasHeader = true;
    result.contentNode = contentNode;
    result.headerPath = headerPath;
    result.topPadPx = 0;
    const cg = vgapTokens('ConvexDialog.Content', contentCls);
    const below = resumeAfterHeader(kids, headerPath, {
      total: cg.total,
      parts: cg.parts,
      loc: cg.parts.length ? `:${contentNode.loc?.start.line}` : '',
    });
    result.postHeaderGapPx = HEADER_MB_PX + (below?.offset ?? 0);
    result.chain = below?.chain ?? [];
    result.gapChain = below?.gapChain ?? [];
    result.fix = below?.fix ?? [];
    result.via = below?.via ?? 'none';
    return result;
  }
  const firstRes = scanSiblings(kids, 0, [], [], vgapTokens('ConvexDialog.Content', contentCls));
  result.topPadPx = FRAME_PX + firstRes.offset;
  result.chain = firstRes.allChains ?? firstRes.chain;
  result.fix = firstRes.fix;
  result.via = firstRes.via;
  return result;
};

// -- fix mode ----------------------------------------------------------
// Rewrites top-side padding tokens inside the flagged className values by
// exact source offsets - no line surgery, no whitespace damage.
//   pt-N/mt-N  -> removed (header mb or frame pad supplies the space)
//   py-N/my-N  -> pb-N/mb-N (keep bottom)
//   p-N/m-N    -> px-N/mx-N pb-N/mb-N (keep sides + bottom)
// Caller p/m tokens on ConvexDialog.Content land on the transparent outer
// wrapper on web (invisible) and break the header bleed on native -> remove.
const FIX_TOKEN = (tok, removeAll) => {
  if (removeAll) return '';
  const m = tok.match(/^((?:sm|md|lg|xl|2xl):)?(-?)(p|m)(t|y|x|l|r|b)?-(.*)$/);
  if (!m) return null;
  const [, pre = '', sign, kind, side, num] = m;
  const P = (s) => `${pre}${sign}${s}-${num}`;
  if (kind === 'p') {
    if (side === 't') return '';
    if (side === 'y') return P('pb');
    if (side === undefined) return `${P('px')} ${P('pb')}`;
    return null;
  }
  if (side === 't') return '';
  if (side === 'y') return P('mb');
  if (side === undefined) return `${P('mx')} ${P('mb')}`;
  return null;
};

// Sites whose flagged top spacing is intentional or needs a structural fix:
// - FolderSettingsDialog:189: py-10 breathes around the "folder missing"
//   empty state (the normal path has no extra pad).
// - Canvas.tsx:2850: p-4 wraps a nested DialogHeader - fixed by hand.
const SKIP_FIX = new Set(['components/game/scriptFiles/FolderSettingsDialog.tsx']);

const applyFixes = (results) => {
  const perFile = new Map(); // file -> [{start,end,ops}]
  const addSite = (r, site, removeAll) => {
    if (!site) return;
    const file = r.file;
    if (SKIP_FIX.has(file)) return;
    const list = perFile.get(file) ?? [];
    list.push({ ...site, removeAll });
    perFile.set(file, list);
  };
  for (const r of results) {
    const anomaly = r.hasHeader ? r.postHeaderGapPx !== HEADER_MB_PX : r.topPadPx !== FRAME_PX;
    if (!anomaly) continue;
    for (const site of r.fix ?? []) addSite(r, site, false);
    // Caller p-* on ConvexDialog.Content itself is intentionally untouched:
    // on web it pads the transparent outer wrapper (invisible); on native it
    // is the only inner pad and removing it would over-bleed the header.
  }
  let changed = 0;
  const manual = [];
  for (const [file, sites] of perFile) {
    const abs = path.join(root, file);
    let src = fs.readFileSync(abs, 'utf8');
    sites.sort((a, b) => b.start - a.start);
    for (const site of sites) {
      const seg = src.slice(site.start, site.end);
      const quote = seg[0];
      if (quote !== '"' && quote !== "'" && quote !== '`') {
        manual.push(`${file}@${site.start} (dynamic className)`);
        continue;
      }
      const inner = seg.slice(1, -1);
      const out = inner
        .split(/\s+/)
        .filter(Boolean)
        .flatMap((tok) => {
          if (!site.toks.includes(tok)) return [tok];
          const rep = FIX_TOKEN(tok, site.removeAll);
          if (rep === null) return [tok];
          return rep ? [rep] : [];
        })
        .join(' ')
        .trim();
      const newSeg = `${quote}${out}${quote}`;
      if (newSeg !== seg) src = src.slice(0, site.start) + newSeg + src.slice(site.end);
    }
    fs.writeFileSync(abs, src);
    changed++;
  }
  console.log(
    `--fix: rewrote ${changed} files` + (manual.length ? `; manual: ${manual.join(', ')}` : '')
  );
};

// -- hoist mode ---------------------------------------------------------
// When the DialogHeader is the first flow child of a gapped container, the
// container's gap stacks on the header's mb. Fix: move the header element
// out so it is a direct sibling immediately BEFORE that container.
const nodePathFor = (contentNode, idxPath) => {
  const els = [];
  let kids = flowKids(contentNode);
  for (const idx of idxPath) {
    const el = kids[idx];
    els.push(el);
    kids = el?.type === 'JSXElement' ? flowKids(el) : [];
  }
  return els;
};

const applyHoists = (results) => {
  const perFile = new Map(); // file -> [{header, parent}]
  const manual = [];
  for (const r of results) {
    if (!r.hasHeader || !r.gapChain?.length) continue;
    const nodes = nodePathFor(r.contentNode, r.headerPath);
    const header = nodes[nodes.length - 1];
    const parent = nodes[nodes.length - 2];
    if (!header || !parent || header.type !== 'JSXElement') {
      manual.push(`${r.file} (no direct parent)`);
      continue;
    }
    if (r.headerPath[r.headerPath.length - 1] !== 0) {
      manual.push(`${r.file} (header not first child)`);
      continue;
    }
    const list = perFile.get(r.file) ?? [];
    list.push({ header, parent });
    perFile.set(r.file, list);
  }
  let changed = 0;
  for (const [file, hoists] of perFile) {
    const abs = path.join(root, file);
    let src = fs.readFileSync(abs, 'utf8');
    const lineStart = (pos) => src.lastIndexOf('\n', pos - 1) + 1;
    const indentOf = (pos) => src.slice(lineStart(pos), pos).match(/^\s*/)?.[0] ?? '';
    for (const { header, parent } of hoists.sort((a, b) => b.header.start - a.header.start)) {
      const hLineStart = lineStart(header.start);
      // Only hoist when the header is alone on its line(s): whitespace before
      // it on the first line and whitespace+newline after it.
      if (src.slice(hLineStart, header.start).trim()) {
        manual.push(`${file}@${header.start} (shares a line)`);
        continue;
      }
      const tail = src.slice(header.end).match(/^[ \t]*\n/);
      if (!tail) {
        manual.push(`${file}@${header.start} (not on own line)`);
        continue;
      }
      const hEnd = header.end + tail[0].length; // header lines + newline
      const headerText = src.slice(header.start, header.end);
      const hIndent = indentOf(header.start);
      const pIndent = indentOf(parent.start);
      // Re-indent continuation lines from the header's old indent to the
      // parent's, preserving relative indentation.
      const reindented = headerText
        .split('\n')
        .map((l, i) => (i === 0 ? l : pIndent + l.replace(new RegExp(`^${hIndent}`), '')))
        .join('\n');
      src =
        src.slice(0, parent.start) +
        reindented +
        '\n' +
        pIndent +
        src.slice(parent.start, hLineStart) +
        src.slice(hEnd);
    }
    fs.writeFileSync(abs, src);
    changed++;
  }
  const total = [...perFile.values()].reduce((n, l) => n + l.length, 0);
  console.log(
    `--hoist: moved ${total} headers in ${changed} files` +
      (manual.length ? `; manual: ${manual.join(', ')}` : '')
  );
};

const files = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') walk(p);
    else if (/\.tsx$/.test(entry.name)) files.push(p);
  }
};
for (const d of DIRS) walk(path.join(root, d));

const results = [];
for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  if (!src.includes('ConvexDialog.Content') && !src.includes('DialogHeader')) continue;
  let ast;
  try {
    ast = parse(src, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
      errorRecovery: true,
    });
  } catch {
    continue;
  }
  const contents = [];
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'JSXElement' && nameOf(node) === 'ConvexDialog.Content') {
      contents.push(node);
    }
    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'start' || key === 'end') continue;
      const v = node[key];
      if (Array.isArray(v)) for (const item of v) visit(item);
      else if (v && typeof v === 'object' && v.type) visit(v);
    }
  };
  visit(ast.program);
  const rel = path.relative(root, file);
  for (const c of contents) results.push(analyzeContent(c, rel));
}

if (process.argv.includes('--fix')) {
  applyFixes(results);
  process.exit(0);
}

if (process.argv.includes('--hoist')) {
  applyHoists(results);
  process.exit(0);
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(results, (k, v) => (k === 'contentNode' ? undefined : v), 2));
  process.exit(0);
}

// --report: write the whole audit to a readable file so the per-dialog top
// spacing can be reviewed in one place instead of spread across components.
if (process.argv.includes('--report')) {
  const target = r => r.hasHeader ? r.postHeaderGapPx : r.topPadPx;
  const expected = r => r.hasHeader ? HEADER_MB_PX : FRAME_PX;
  const sorted = [...results].sort((a, b) => target(b) - target(a));
  const lines = [
    '# Dialog top-spacing report',
    '',
    `Generated by \`node scripts/audit-dialog-padding.mjs --report\` on ${new Date().toISOString().slice(0, 10)}.`,
    '',
    `- **Header dialogs**: gap below \`DialogHeader\` should be **${HEADER_MB_PX}px** (its \`mb-3\`).`,
    `- **Headerless dialogs**: top edge to first visible content should be **${FRAME_PX}px** (frame \`p-5\`).`,
    '',
    '| Status | File | Header | Top pad | After header | Chain to first visible |',
    '|---|---|---|---|---|---|',
    ...sorted.map((r) =>
      `| ${target(r) === expected(r) ? 'ok' : '**ANOMALY**'} | \`${r.file}\` | ${r.hasHeader ? 'yes' : 'no'} | ${r.topPadPx}px | ${r.hasHeader ? `${r.postHeaderGapPx}px` : '-'} | ${(r.chain.join(' + ') || '(none)')} → ${r.via} |`
    ),
    '',
    `${results.length} dialogs audited; ${results.filter((r) => target(r) !== expected(r)).length} anomalies.`,
    '',
  ];
  const out = path.join(root, 'scripts', 'dialog-padding-report.md');
  fs.writeFileSync(out, lines.join('\n'));
  console.log(`wrote ${path.relative(process.cwd(), out)}`);
  process.exit(0);
}

const pad = (s, n) => String(s).padEnd(n);
console.log(
  pad('file', 62) + pad('header', 8) + pad('topPad', 8) + pad('afterHdr', 10) + 'chain -> first visible'
);
console.log('-'.repeat(140));
for (const r of results.sort(
  (a, b) => (b.postHeaderGapPx ?? b.topPadPx) - (a.postHeaderGapPx ?? a.topPadPx)
)) {
  console.log(
    pad(r.file, 62) +
      pad(r.hasHeader ? 'yes' : 'no', 8) +
      pad(`${r.topPadPx}px`, 8) +
      pad(r.hasHeader ? `${r.postHeaderGapPx}px` : '-', 10) +
      `${r.chain.join(' + ') || '(none)'} -> ${r.via}`
  );
}
const anomalies = results.filter((r) =>
  r.hasHeader ? r.postHeaderGapPx !== HEADER_MB_PX : r.topPadPx !== FRAME_PX
);
console.log('-'.repeat(140));
console.log(
  `${results.length} dialogs audited; ${anomalies.length} with extra top spacing beyond the ${HEADER_MB_PX}px header gap / ${FRAME_PX}px frame pad.`
);
