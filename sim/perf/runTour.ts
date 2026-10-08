/**
 * sim/perf/runTour.ts
 *
 * The "Simulate Everything" driver. Walks the entire seeded app — every game
 * role, every tab (cold + warm), thread-list → thread-detail navigation,
 * scroll-heavy screens, every modal in the ModalLab, minimize/restore — and
 * records a measured StepResult per action into perfLog.
 */

import { GAME_NEWSER, GAME_OP, GAME_PLAYER } from '../seedData';
import { mockDb } from '../mockDb';
import { beginWindow, perfLog, StepResult } from './log';
import { buildMarkdownReport, downloadMarkdown } from './report';
import {
  byTestId,
  byText,
  closeOpenDialogs,
  dispatchTap,
  driveScroll,
  findPageScrollables,
  openDialogs,
  sleep,
  waitFor,
} from './domTools';
import { simUi } from './uiState';

export interface TourProgress {
  done: number;
  total: number;
  label: string;
}

type StepKind = Parameters<typeof beginWindow>[1]['kind'];

const OPERATOR_TABS = ['players', 'config', 'nightly', 'forum', 'newspaper', 'rulebook'];
const PLAYER_TABS = ['townSquare', 'newspaper', 'eyesOnly', 'ruleBook', 'phoneBook'];
const NEWSER_TABS = ['townSquare', 'newspaper', 'ruleBook', 'phoneBook'];

let cancelled = false;
export function cancelTour() {
  cancelled = true;
}

// ---------------------------------------------------------------------------

let progressCb: (p: TourProgress) => void = () => {};
let stepCount = 0;
let plannedTotal = 0;

interface StepOpts {
  quietMs?: number;
  timeoutMs?: number;
  tailMs?: number;
  manual?: boolean;
  /** post-action assertion — checked after fn() (waits up to 2.5s). A failed
   *  check marks the step as an error instead of silently measuring the
   *  wrong state. */
  verify?: { desc: string; check: () => boolean };
  /** a dialog is expected to remain open after this step (e.g. minimize) */
  expectOpenDialog?: boolean;
}

/** Kinds that assume a clean page underneath — a leaked dialog corrupts them. */
const PAGE_STATE_KINDS = new Set<StepKind>(['navigate', 'tab', 'scroll']);

async function step(
  label: string,
  kind: StepKind,
  fn: () => Promise<void> | void,
  opts: StepOpts = {}
): Promise<StepResult> {
  if (cancelled) throw new Error('tour cancelled');
  stepCount++;
  progressCb({ done: stepCount, total: plannedTotal, label });

  // State precondition: page-level steps must not run on top of a dialog that
  // a previous step failed to close. Record the violation AND self-heal so
  // later measurements stay trustworthy.
  if (PAGE_STATE_KINDS.has(kind) && !opts.expectOpenDialog && openDialogs().length > 0) {
    const n = openDialogs().length;
    perfLog.note(
      `state-check: ${n} dialog(s) still open before "${label}"`,
      'a previous modal-close did not take — recovered by force-closing before measuring',
      `stale dialog leak (x${n})`
    );
    await closeOpenDialogs(() => simUi.closeModal());
  }

  const win = beginWindow(label, { kind, quietMs: opts.quietMs, timeoutMs: opts.timeoutMs, tailMs: opts.tailMs, manual: opts.manual });
  try {
    await fn();
    if (opts.verify) {
      const ok = await waitFor(() => opts.verify!.check(), 2500);
      if (!ok) return win.fail(new Error(`verify failed: ${opts.verify.desc}`));
    }
    if (kind === 'modal-close' && !opts.expectOpenDialog) {
      const clean = await waitFor(() => openDialogs().length === 0, 2000);
      if (!clean) return win.fail(new Error('verify failed: dialog still open after close'));
    }
  } catch (e) {
    return win.fail(e);
  }
  return win.end();
}

function note(label: string, notes?: string) {
  perfLog.note(label, notes);
}

function clickEl(el: Element | null): boolean {
  if (!el) return false;
  dispatchTap(el);
  return true;
}

const clickTestId = (id: string) => clickEl(byTestId(id));
const clickText = (t: string) => clickEl(byText(t));

/** Biggest scrollable region on the page (usually the screen's scrollview). */
async function scrollMain(label: string, fraction = 0.7, durationMs = 1400) {
  return step(label, 'scroll', async () => {
    // page scrollables only — never a scrollable inside a (possibly stale) dialog
    const scrollables = findPageScrollables().filter((s) => s.range > 200);
    if (scrollables.length === 0) return;
    const target = scrollables[0].el;
    await driveScroll(target, { fraction, durationMs });
    // brief rest at the bottom so lazy content mounts inside the window
    await sleep(300);
    await driveScroll(target, { fraction: 0.5, durationMs: 900, reverse: true });
  }, { manual: true, timeoutMs: 20000 });
}

async function gotoTab(tab: string, cold: boolean, prefix = '') {
  const el = byTestId(`gametab-${tab}`);
  if (!el) {
    note(`skip tab ${prefix}${tab}`, 'tab button not found in DOM');
    return;
  }
  await step(
    `tab → ${prefix}${tab} (${cold ? 'cold mount' : 'warm revisit'})`,
    'tab',
    () => {
      clickEl(el);
    },
    {
      tailMs: cold ? 250 : 0,
      quietMs: cold ? 300 : 180,
      verify: {
        desc: `gametab-${tab} did not become active`,
        check: () => !!byTestId(`gametab-${tab}`)?.closest('.guilded-game-tab-wrap')?.classList.contains('is-active'),
      },
    }
  );
}

async function openGame(gameId: string, label: string) {
  await step(`open game: ${label}`, 'navigate', async () => {
    const row = await waitFor(() => byTestId(`game-${gameId}`), 6000);
    if (!row) throw new Error(`game row ${gameId} not found`);
    dispatchTap(row);
    const ok = await waitFor(() => byTestId('gametab-players') || byTestId('gametab-townSquare'), 15000);
    if (!ok) throw new Error('game tabs never appeared');
  }, { tailMs: 600, quietMs: 350, timeoutMs: 20000 });
}

async function goHome() {
  await step('navigate → game list', 'navigate', async () => {
    const home = await waitFor(() => byTestId('nav-home'), 8000);
    if (!home) throw new Error('home button not found');
    dispatchTap(home);
    await waitFor(() => byTestId(`game-${GAME_OP}`), 10000);
  }, { tailMs: 500 });
}

/**
 * Close whatever dialog is open, via its real close control ([aria-label="Close"])
 * — the same path a user takes. simUi.closeModal() is only a documented fallback;
 * the step FAILS if any dialog remains, instead of silently measuring a leak.
 */
async function closeDialogsStep(label: string) {
  return step(label, 'modal-close', async () => {
    const remaining = await closeOpenDialogs(() => simUi.closeModal());
    if (remaining > 0) throw new Error(`${remaining} dialog(s) still open after close attempt`);
  }, { quietMs: 250 });
}

const dialogOpened = { desc: 'no [role="dialog"] appeared', check: () => openDialogs().length > 0 };

/** Open a modal-lab dialog, measure, then close it (real close control → force-close fallback). */
async function labModal(id: string, label: string) {
  await step(`modal open: ${label}`, 'modal-open', async () => {
    const btn = await waitFor(() => byTestId(`modallab-open-${id}`), 4000);
    if (!btn) throw new Error('lab button missing');
    dispatchTap(btn);
  }, { tailMs: 350, quietMs: 300, verify: dialogOpened });

  await closeDialogsStep(`modal close: ${label}`);
}

// ---------------------------------------------------------------------------

export async function runFullTour(onProgress: (p: TourProgress) => void) {
  cancelled = false;
  progressCb = onProgress;
  stepCount = 0;
  plannedTotal = 130; // approximate; updated as we go

  perfLog.reset();
  perfLog.install();
  mockDb.resetStats();
  const runStart = performance.now();

  note('Perf audit tour starting', `UA: ${navigator.userAgent}`);

  // ======================================================================
  // PHASE A — game list
  // ======================================================================
  note('Phase A — game list');
  await waitFor(() => byTestId(`game-${GAME_OP}`), 10000);
  await scrollMain('scroll: game list', 0.6, 800);
  await step('action: New WolffsPoint dialog open', 'modal-open', async () => {
    if (!clickText('New WolffsPoint') && !clickText('New WP')) throw new Error('create button not found');
  }, { tailMs: 250, verify: dialogOpened }).catch(() => {});
  await closeDialogsStep('modal close: New WolffsPoint').catch(() => {});

  // ======================================================================
  // PHASE B — operator game
  // ======================================================================
  note('Phase B — operator game', 'current user owns SIMOP1234');
  await openGame(GAME_OP, 'SIMOP1234 (as operator)');

  // cold pass — first mount of each tab
  for (const t of OPERATOR_TABS.slice(1)) await gotoTab(t, true, 'op:');
  await gotoTab('players', false, 'op:');

  // warm pass — all tabs mounted now
  for (const t of [...OPERATOR_TABS.slice(1), 'players']) await gotoTab(t, false, 'op:');

  // rapid cycle — simulates fast tapping
  await step('rapid tab cycle (all 6 operator tabs)', 'action', async () => {
    for (const t of OPERATOR_TABS) {
      clickTestId(`gametab-${t}`);
      await sleep(110);
    }
  }, { tailMs: 400, quietMs: 350 });

  // ---- per-tab scroll + interactions -----------------------------------
  await gotoTab('players', false, 'op:');
  await scrollMain('scroll: operator players table (vertical)', 0.8, 1600);
  await step('scroll: players table horizontal', 'scroll', async () => {
    const h = findPageScrollables().find((s) => s.el.scrollWidth - s.el.clientWidth > 300);
    if (!h) return;
    const el = h.el;
    const range = el.scrollWidth - el.clientWidth;
    const start = el.scrollLeft;
    const t0 = performance.now();
    await new Promise<void>((resolve) => {
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / 1200);
        el.scrollLeft = start + range * 0.7 * p;
        if (p >= 1) resolve();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, { manual: true });

  // nightly
  await gotoTab('nightly', false, 'op:');
  await scrollMain('scroll: operator nightly', 0.7, 1200);
  await step('modal open: Review/Certify (nightly)', 'modal-open', async () => {
    if (!clickText('Review / Certify')) throw new Error('certify trigger not found');
  }, { tailMs: 300, verify: dialogOpened }).catch(() => {});
  await closeDialogsStep('modal close: Review/Certify').catch(() => {});

  // town square — thread nav
  await gotoTab('forum', false, 'op:');
  await scrollMain('scroll: town square thread list', 0.6, 1100);
  await step('navigate: thread list → thread detail', 'navigate', async () => {
    const thread = await waitFor(() => document.querySelector('[data-testid="townthread-open"]'), 5000);
    if (!thread) throw new Error('no thread rows found');
    dispatchTap(thread);
    await waitFor(() => byTestId('townthread-back'), 8000);
  }, { tailMs: 300 });
  await scrollMain('scroll: thread detail comments', 0.7, 1200);
  await step('navigate: thread detail → thread list', 'navigate', async () => {
    if (!clickTestId('townthread-back')) throw new Error('back control missing');
    await waitFor(() => document.querySelector('[data-testid="townthread-open"]'), 8000);
  }, { tailMs: 250 });
  // second thread (warmer)
  await step('navigate: open second thread (warm)', 'navigate', async () => {
    const threads = document.querySelectorAll('[data-testid="townthread-open"]');
    const target = threads[1] ?? threads[0];
    if (!target) throw new Error('no thread rows');
    dispatchTap(target);
    await waitFor(() => byTestId('townthread-back'), 8000);
  }, { tailMs: 250 });
  await step('navigate: back to thread list (warm)', 'navigate', async () => {
    clickTestId('townthread-back');
    await waitFor(() => document.querySelector('[data-testid="townthread-open"]'), 8000);
  }, { tailMs: 200 });
  // new thread composer modal
  await step('modal open: New Thread composer', 'modal-open', async () => {
    if (!clickTestId('townsquare-newthread')) throw new Error('composer trigger not found');
  }, { tailMs: 300, verify: dialogOpened }).catch(() => {});
  await closeDialogsStep('modal close: New Thread composer').catch(() => {});

  // newspaper
  await gotoTab('newspaper', false, 'op:');
  await scrollMain('scroll: operator newspaper', 0.8, 1500);

  // config tab (labeled 'rulebook' in the tab bar) — sub-navigates to rule book + phone book
  await gotoTab('rulebook', false, 'op:');
  await scrollMain('scroll: operator config page', 0.7, 1100);
  await step('navigate: config → rule book subpage', 'navigate', async () => {
    const card = await waitFor(() => byTestId('config-open-rulebook'), 5000);
    if (!card) throw new Error('rule book preview card missing');
    dispatchTap(card);
    await waitFor(() => byTestId('rulebook-toc-btn'), 8000);
  }, { tailMs: 300 });
  await scrollMain('scroll: operator rulebook (scroll-linked TOC)', 0.9, 1800);
  await step('modal open: rulebook table of contents', 'modal-open', async () => {
    const btn = await waitFor(() => byTestId('rulebook-toc-btn'), 4000);
    if (!btn) throw new Error('toc button missing');
    dispatchTap(btn);
  }, { tailMs: 300, verify: dialogOpened }).catch(() => {});
  await closeDialogsStep('modal close: rulebook TOC').catch(() => {});
  await step('navigate: rule book → config', 'navigate', async () => {
    if (!clickTestId('rulebook-back')) throw new Error('rulebook back missing');
    await waitFor(() => byTestId('config-open-rulebook'), 8000);
  }, { tailMs: 250 });
  await step('navigate: config → phone book subpage', 'navigate', async () => {
    const card = await waitFor(() => byTestId('config-open-phonebook'), 5000);
    if (!card) throw new Error('phone book preview card missing');
    dispatchTap(card);
    await waitFor(() => byTestId('phonebook-back'), 8000);
  }, { tailMs: 300 });
  await scrollMain('scroll: operator phone book', 0.7, 1100);
  await step('navigate: phone book → config', 'navigate', async () => {
    if (!clickTestId('phonebook-back')) throw new Error('phonebook back missing');
  }, { tailMs: 250 });

  // roles tab
  await gotoTab('config', false, 'op:');
  await scrollMain('scroll: operator roles table', 0.7, 1200);

  await goHome();

  // ======================================================================
  // PHASE C — player game
  // ======================================================================
  note('Phase C — player game', 'current user is a player in SIMPLY567');
  await openGame(GAME_PLAYER, 'SIMPLY567 (as player)');
  for (const t of PLAYER_TABS.slice(1)) await gotoTab(t, true, 'player:');
  for (const t of [...PLAYER_TABS.slice(1), PLAYER_TABS[0]]) await gotoTab(t, false, 'player:');
  await gotoTab('townSquare', false, 'player:');
  await scrollMain('scroll: player town square', 0.6, 1000);
  await gotoTab('newspaper', false, 'player:');
  await scrollMain('scroll: player newspaper', 0.8, 1400);
  await gotoTab('eyesOnly', false, 'player:');
  await scrollMain('scroll: player eyes only', 0.7, 1100);
  await gotoTab('ruleBook', false, 'player:');
  await scrollMain('scroll: player rulebook (scroll-linked)', 0.9, 1600);
  await gotoTab('phoneBook', false, 'player:');
  await scrollMain('scroll: player phone book', 0.7, 1100);
  await goHome();

  // ======================================================================
  // PHASE D — newser game
  // ======================================================================
  note('Phase D — newser game', 'current user is the newser of SIMNEWS9');
  await openGame(GAME_NEWSER, 'SIMNEWS9 (as newser)');
  for (const t of NEWSER_TABS.slice(1)) await gotoTab(t, true, 'newser:');
  for (const t of [...NEWSER_TABS.slice(1), NEWSER_TABS[0]]) await gotoTab(t, false, 'newser:');
  await gotoTab('newspaper', false, 'newser:');
  await scrollMain('scroll: newser newspaper editor', 0.8, 1500);
  await goHome();

  // ======================================================================
  // PHASE E — modal lab
  // ======================================================================
  note('Phase E — modal lab', 'every dialog with fixture data, opened/closed/measured');
  simUi.set({ labOpen: true });
  await waitFor(() => byTestId('modallab-open-confirm'), 5000);

  const modalIds = Array.from(document.querySelectorAll('[data-testid^="modallab-open-"]'))
    .map((el) => el.getAttribute('data-testid')!.replace('modallab-open-', ''));

  for (const id of modalIds) {
    if (cancelled) break;
    // find the row's label text for a readable step name (first child = label)
    const btn = byTestId(`modallab-open-${id}`);
    const label = btn?.children[0]?.textContent?.trim() || id;
    await labModal(id, label).catch(() => {});
    // special case: exercise minimize → restore on the heavy editor
    if (id === 'markdown-editor') {
      await step('modal open: markdown-editor (for minimize test)', 'modal-open', async () => {
        dispatchTap(byTestId('modallab-open-markdown-editor')!);
      }, { tailMs: 300 });
      await step('modal minimize: markdown-editor', 'action', async () => {
        const minBtn = document.querySelector('[aria-label="Minimize"]');
        if (!minBtn) throw new Error('minimize button not found in dialog');
        dispatchTap(minBtn);
        await waitFor(() => byTestId('minimized-card'), 5000);
      }, { tailMs: 300 });
      await step('modal restore: markdown-editor', 'action', async () => {
        const card = byTestId('minimized-card');
        if (!card) throw new Error('minimized card not found');
        dispatchTap(card);
      }, { tailMs: 400, quietMs: 300, verify: { desc: 'restored dialog not visible', check: () => openDialogs().length > 0 } });
      await closeDialogsStep('modal close: markdown-editor (after restore)');
    }
  }

  simUi.set({ labOpen: false });

  // ======================================================================
  // wrap up — report
  // ======================================================================
  const durationMs = performance.now() - runStart;
  note('Tour complete', `${stepCount} steps in ${(durationMs / 1000).toFixed(1)}s`);

  const md = buildMarkdownReport({
    userAgent: navigator.userAgent,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    devicePixelRatio: window.devicePixelRatio,
    hardwareConcurrency: (navigator as any).hardwareConcurrency,
    deviceMemory: (navigator as any).deviceMemory,
    queryLatencyMs: mockDb.queryLatencyMs,
    startedAtIso: new Date().toISOString(),
    durationMs,
  });

  simUi.set({ lastReport: md, tourRunning: false });
  // stash for headless drivers (Firefox/BiDi can't intercept downloads via CDP)
  (window as any).__perfReport = md;

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  downloadMarkdown(`wolffspoint-perf-audit-${stamp}.md`, md);
  return md;
}
