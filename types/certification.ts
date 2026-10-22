import type { CellOp } from '../utils/cellPieces';

/** Addresses contain permanent IDs, never array positions, emails, or titles. */
export type EffectTarget = {
  playerId: string;
  dayId: string | null;
  columnId: string;
};

export type EffectValue = string | number | boolean | null | string[] | Record<string, string>;

export type EffectOperation =
  | { kind: 'set'; value: EffectValue }
  | { kind: 'number'; mode: 'add' | 'multiply'; value: number }
  | { kind: 'cell'; op: Omit<CellOp, 'source'> };

export type CertificationScope = {
  gameId: string;
  dayId: string;
  type: 'votes' | 'actions';
};

export type CertificationBranch = {
  id: string;
  playerId: string;
  submissionId: string;
  submissionRevision: string;
  /** The immutable input/plan actually executed, not a reference to a live submission. */
  snapshot: string;
};

export type CertificationRun = {
  id: string;
  scope: CertificationScope;
  actorId: string;
  createdAt: number;
  supersedes: string[];
  branches: CertificationBranch[];
};

export type EffectCause =
  | { kind: 'certification'; runId: string; branchId: string }
  | { kind: 'manual'; eventId: string }
  | {
      kind: 'trigger';
      placementId: string;
      scriptRevision: string;
      /** OR support: a shared placement survives while any independent owner is live. */
      supports: string[];
    };

export type CertificationEffect = {
  id: string;
  sequence: number;
  target: EffectTarget;
  operation: EffectOperation;
  cause: EffectCause;
  /** Effects read while evaluating this operand; used when review changes the plan. */
  readEffectIds?: string[];
  /** Primary vote/action effects conflict at branch level, including their descendants. */
  primary?: boolean;
};

export type ManualDecision = {
  id: string;
  actorId: string;
  createdAt: number;
  target: EffectTarget;
  operation: EffectOperation;
  /** Explicit intent, including same-value edits. Never inferred from value equality. */
  overrides: string[];
};

export type CertificationLedger = {
  version: 1;
  namespace: string;
  revision: number;
  nextSequence: number;
  bases: { target: EffectTarget; value: EffectValue }[];
  runs: CertificationRun[];
  retiredRunIds: string[];
  effects: CertificationEffect[];
  /** Rejected proposals remain auditable but can never become active later. */
  suppressedEffectIds: string[];
  manualDecisions: ManualDecision[];
  /** Decisions superseded by a reviewed "Use new certification" choice. */
  releasedDecisionIds: string[];
  resolutions: {
    runId: string;
    decisions: { decisionId: string; choice: ConflictChoice }[];
  }[];
};

export type CertificationConflict = {
  decisionId: string;
  target: EffectTarget;
  previousEffectIds: string[];
  proposedEffectIds: string[];
  branchIds: string[];
  currentValue: EffectValue;
  proposedValue: EffectValue;
};

export type CertificationPlan = {
  namespace: string;
  expectedRevision: number;
  /** Covers values and execution dependencies (submissions/scripts/structure). */
  expectedFingerprint: string;
  run: CertificationRun;
  effects: CertificationEffect[];
  conflicts: CertificationConflict[];
};

export type ConflictChoice = 'keep' | 'replace';
