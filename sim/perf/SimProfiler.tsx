/**
 * sim/perf/SimProfiler.tsx
 *
 * React Profiler boundary. Wrap a subtree to have every commit's
 * actualDuration logged into the perf log with this id.
 *
 * Call sites live permanently in the app (they mark named subtrees worth
 * measuring). Outside sim mode this renders children untouched — zero cost.
 */

import React, { Profiler } from 'react';
import { perfLog } from './log';
import { isSimMode } from '../isSim';

export function SimProfiler({ id, children }: { id: string; children: React.ReactNode }) {
  if (!isSimMode) return <>{children}</>;
  return (
    <Profiler
      id={id}
      onRender={(id, phase, actualDuration, baseDuration, startTime, commitTime) => {
        perfLog.logCommit(id, phase, actualDuration, baseDuration, startTime, commitTime);
      }}>
      {children}
    </Profiler>
  );
}
