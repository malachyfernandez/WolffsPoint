/**
 * sim/perf/report.ts
 *
 * Renders the collected StepResults into a readable markdown audit report
 * and downloads it (or copies to clipboard as a fallback).
 */

import { StepResult } from './log';

const ms = (n: number | null | undefined, digits = 0) =>
  n === null || n === undefined ? '—' : `${n.toFixed(digits)}ms`;

function rating(step: StepResult): string {
  // heuristics: nav/tab/modal over 700ms settle or any longtask >150ms = SLOW
  if (step.error) return '⚠️ error';
  const worst = step.longTasks.worstMs;
  if (step.settleMs > 1200 || worst > 300) return '🔴 slow';
  if (step.settleMs > 500 || worst > 120) return '🟡 meh';
  return '🟢 ok';
}

function framesLine(step: StepResult): string {
  if (!step.frames || step.frames.count === 0) return '';
  const f = step.frames;
  return `frames ${f.count} · avg ${f.avgMs.toFixed(1)}ms · p95 ${f.p95Ms.toFixed(0)}ms · worst ${f.maxMs.toFixed(0)}ms · >50ms: ${f.slowFrames}`;
}

export function buildMarkdownReport(meta: {
  userAgent: string;
  viewport: string;
  devicePixelRatio: number;
  hardwareConcurrency?: number;
  deviceMemory?: number;
  queryLatencyMs: number;
  startedAtIso: string;
  durationMs: number;
}): string {
  const steps = (
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('./log') as typeof import('./log')
  ).perfLog.steps;

  const out: string[] = [];
  out.push(`# WolffsPoint Perf Audit — Simulated Run`);
  out.push('');
  out.push(`- **Started**: ${meta.startedAtIso}`);
  out.push(`- **Run duration**: ${(meta.durationMs / 1000).toFixed(1)}s`);
  out.push(`- **UA**: \`${meta.userAgent}\``);
  out.push(`- **Viewport**: ${meta.viewport} @ ${meta.devicePixelRatio}x`);
  out.push(`- **CPU cores**: ${meta.hardwareConcurrency ?? '?'} · **Memory**: ${meta.deviceMemory ?? '?'}GB`);
  out.push(`- **Simulated backend latency**: ${meta.queryLatencyMs}ms`);
  out.push('');

  // --- summary table -------------------------------------------------------
  out.push('## Summary');
  out.push('');
  out.push('| # | Step | Kind | Settle | First paint | Frames | Long tasks | Slowest subtree | Rating |');
  out.push('|---|------|------|--------|-------------|--------|------------|-----------------|--------|');
  steps.forEach((s, i) => {
    const worstProfiler = s.profilers[0];
    const profilerCell = worstProfiler
      ? `${worstProfiler.boundaryId} ${worstProfiler.totalActualMs.toFixed(0)}ms (${worstProfiler.commits} commits)`
      : '—';
    out.push(
      `| ${i + 1} | ${s.label.replace(/\|/g, '\\|')} | ${s.kind} | ${ms(s.settleMs)} | ${ms(s.firstPaintMs)} | ${s.frames ? `p95 ${s.frames.p95Ms.toFixed(0)}ms, ${s.frames.slowFrames} slow` : '—'} | ${s.longTasks.count ? `${s.longTasks.count} (${s.longTasks.worstMs.toFixed(0)}ms worst)` : '0'} | ${profilerCell} | ${rating(s)} |`
    );
  });
  out.push('');

  // --- worst offenders ------------------------------------------------------
  const sorted = [...steps]
    .filter((s) => s.kind !== 'note')
    .sort((a, b) => b.settleMs - a.settleMs)
    .slice(0, 10);
  out.push('## Slowest steps');
  out.push('');
  sorted.forEach((s) => {
    out.push(
      `- **${ms(s.settleMs)}** — ${s.label} (longTasks ${s.longTasks.count}/${s.longTasks.worstMs.toFixed(0)}ms, p95 frame ${s.frames?.p95Ms.toFixed(0) ?? '—'}ms)`
    );
  });
  out.push('');

  // --- per-step detail ------------------------------------------------------
  out.push('## Detail log');
  out.push('');
  for (const s of steps) {
    if (s.kind === 'note') {
      out.push(`### — ${s.label}`);
      if (s.notes) out.push(`> ${s.notes}`);
      out.push('');
      continue;
    }
    out.push(`### ${s.label}`);
    out.push(`- kind: \`${s.kind}\` · measured at +${(s.startedAt).toFixed(0)}ms into run`);
    out.push(`- **settle**: ${ms(s.settleMs)} · **first DOM change**: ${ms(s.firstPaintMs)} · **window**: ${ms(s.durationMs)}`);
    if (s.frames) out.push(`- ${framesLine(s)}`);
    if (s.longTasks.count > 0) {
      out.push(`- long tasks: ${s.longTasks.count} (total ${s.longTasks.totalMs.toFixed(0)}ms, worst ${s.longTasks.worstMs.toFixed(0)}ms)`);
    }
    if (s.mutations.length > 0) {
      out.push(`- backend writes this window: ${s.mutations.map((m) => `${m.name} ${m.ms.toFixed(1)}ms`).join(', ')}`);
    }
    out.push(`- queries subscribed during window: ${s.queriesRun} · active data subs after: ${s.activeDataSubs} · dom mutations: ${s.domMutations} · heap: ${s.heapMb ?? 'n/a'}MB`);
    if (s.profilers.length > 0) {
      out.push(`- react commits by boundary (worst first):`);
      for (const p of s.profilers.slice(0, 12)) {
        out.push(
          `  - \`${p.boundaryId}\`: ${p.commits} commits, total ${p.totalActualMs.toFixed(0)}ms, worst ${p.maxActualMs.toFixed(0)}ms`
        );
      }
    }
    if (s.notes) out.push(`- notes: ${s.notes}`);
    if (s.error) out.push(`- **error**: ${s.error}`);
    out.push('');
  }

  return out.join('\n');
}

export function downloadMarkdown(filename: string, contents: string) {
  const blob = new Blob([contents], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 2000);
}
