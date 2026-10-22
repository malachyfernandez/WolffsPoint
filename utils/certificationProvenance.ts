import type {
  CertificationConflict,
  CertificationEffect,
  CertificationLedger,
  CertificationPlan,
  CertificationRun,
  CertificationScope,
  ConflictChoice,
  EffectOperation,
  EffectTarget,
  EffectValue,
  ManualDecision,
} from '../types/certification';
import { applyCellOp } from './cellPieces';
import { deepEqual } from './deepEqual';

export const effectTargetKey = (target: EffectTarget): string =>
  JSON.stringify([target.playerId, target.dayId, target.columnId]);

const sameScope = (a: CertificationScope, b: CertificationScope) =>
  a.gameId === b.gameId && a.dayId === b.dayId && a.type === b.type;

export const createCertificationLedger = (namespace: string): CertificationLedger => ({
  version: 1,
  namespace,
  revision: 0,
  nextSequence: 0,
  bases: [],
  runs: [],
  retiredRunIds: [],
  effects: [],
  suppressedEffectIds: [],
  manualDecisions: [],
  releasedDecisionIds: [],
  resolutions: [],
});

const unique = (values: string[]) => new Set(values).size === values.length;

export const validateCertificationLedger = (ledger: CertificationLedger): void => {
  if (ledger.version !== 1 || !ledger.namespace) throw new Error('Invalid certification ledger');
  const ids = [
    ...ledger.runs.map((run) => run.id),
    ...ledger.runs.flatMap((run) => run.branches.map((branch) => branch.id)),
    ...ledger.effects.map((effect) => effect.id),
    ...ledger.manualDecisions.map((decision) => decision.id),
  ];
  if (!unique(ids) || ids.some((id) => !id)) throw new Error('Duplicate or empty provenance ID');
  if (!unique(ledger.effects.map((effect) => String(effect.sequence)))) {
    throw new Error('Duplicate effect sequence');
  }
  if (!unique(ledger.bases.map(({ target }) => effectTargetKey(target)))) {
    throw new Error('Duplicate effect base');
  }
  const bases = new Set(ledger.bases.map(({ target }) => effectTargetKey(target)));
  const effects = new Set(ledger.effects.map((effect) => effect.id));
  const decisions = new Set(ledger.manualDecisions.map((decision) => decision.id));
  const runs = new Map(ledger.runs.map((run) => [run.id, run]));
  if (
    !Number.isSafeInteger(ledger.revision) ||
    ledger.revision < 0 ||
    !Number.isSafeInteger(ledger.nextSequence) ||
    ledger.nextSequence < 0 ||
    ledger.effects.some((effect) => effect.sequence >= ledger.nextSequence)
  ) {
    throw new Error('Invalid ledger revision or sequence');
  }
  const validateTarget = (target: EffectTarget) => {
    if (!target.playerId || !target.columnId || target.dayId === '') {
      throw new Error('Invalid stable target');
    }
  };
  ledger.bases.forEach(({ target }) => validateTarget(target));
  for (const run of ledger.runs) {
    if (!run.scope.gameId || !run.scope.dayId || !run.actorId) throw new Error('Invalid run');
    if (run.supersedes.some((id) => !runs.has(id) || !sameScope(runs.get(id)!.scope, run.scope))) {
      throw new Error('Invalid superseded scope');
    }
    if (!unique(run.branches.map((branch) => branch.playerId))) {
      throw new Error('Multiple branches for the same player');
    }
    if (
      run.branches.some(
        (branch) => !branch.playerId || !branch.submissionId || !branch.submissionRevision
      )
    ) {
      throw new Error('Invalid submission identity');
    }
  }
  for (const effect of ledger.effects) {
    if (!bases.has(effectTargetKey(effect.target))) throw new Error('Missing effect base');
    if (!Number.isSafeInteger(effect.sequence) || effect.sequence < 0) {
      throw new Error('Invalid effect sequence');
    }
    const cause = effect.cause;
    if (effect.readEffectIds?.some((id) => !effects.has(id))) {
      throw new Error('Missing read dependency');
    }
    if (cause.kind === 'certification') {
      if (!runs.get(cause.runId)?.branches.some((branch) => branch.id === cause.branchId)) {
        throw new Error('Missing certification branch');
      }
    } else if (cause.kind === 'manual') {
      if (!decisions.has(cause.eventId)) throw new Error('Missing manual event');
      const decision = ledger.manualDecisions.find((item) => item.id === cause.eventId)!;
      if (
        effectTargetKey(effect.target) !== effectTargetKey(decision.target) ||
        !deepEqual(effect.operation, decision.operation)
      ) {
        throw new Error('Manual root must describe its originating decision');
      }
    } else if (cause.supports.some((id) => !effects.has(id))) {
      throw new Error('Missing causal support');
    }
  }
  for (const decision of ledger.manualDecisions) {
    if (!bases.has(effectTargetKey(decision.target))) throw new Error('Missing manual base');
    if (decision.overrides.some((id) => !effects.has(id))) {
      throw new Error('Missing overridden effect');
    }
  }
  if (ledger.retiredRunIds.some((id) => !runs.has(id))) throw new Error('Missing retired run');
  if (ledger.releasedDecisionIds.some((id) => !decisions.has(id))) {
    throw new Error('Missing released decision');
  }
  if (ledger.suppressedEffectIds.some((id) => !effects.has(id))) {
    throw new Error('Missing suppressed effect');
  }
  for (const resolution of ledger.resolutions) {
    if (
      !runs.has(resolution.runId) ||
      resolution.decisions.some(
        (decision) =>
          !decisions.has(decision.decisionId) ||
          (decision.choice !== 'keep' && decision.choice !== 'replace')
      )
    ) {
      throw new Error('Invalid conflict resolution');
    }
  }
};

/**
 * Reachability, not reference counts: unsupported trigger cycles cannot keep
 * themselves alive after the final independent root is retired.
 */
export const activeCertificationEffects = (
  ledger: CertificationLedger,
  suppressedIds: ReadonlySet<string> = new Set()
): CertificationEffect[] => {
  const retired = new Set(ledger.retiredRunIds);
  const released = new Set(ledger.releasedDecisionIds);
  const suppressed = new Set([...ledger.suppressedEffectIds, ...suppressedIds]);
  const active = new Set<string>();
  for (const effect of ledger.effects) {
    if (suppressed.has(effect.id)) continue;
    if (
      (effect.cause.kind === 'certification' && !retired.has(effect.cause.runId)) ||
      (effect.cause.kind === 'manual' && !released.has(effect.cause.eventId))
    ) {
      active.add(effect.id);
    }
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const effect of ledger.effects) {
      if (active.has(effect.id) || suppressed.has(effect.id)) continue;
      if (effect.cause.kind === 'trigger' && effect.cause.supports.some((id) => active.has(id))) {
        active.add(effect.id);
        changed = true;
      }
    }
  }
  return ledger.effects
    .filter((effect) => active.has(effect.id))
    .sort((a, b) => a.sequence - b.sequence);
};

export const applyEffectOperation = (
  current: EffectValue,
  operation: EffectOperation,
  source: string
): EffectValue => {
  if (operation.kind === 'set') return operation.value;
  if (operation.kind === 'cell') {
    if (typeof current !== 'string') throw new Error('Cell effect requires a string base');
    // Administrative retirement also retires AUTOREMOVE=False consequences.
    // Its ordinary tag-removal policy is separate from run ownership.
    return applyCellOp(current, { ...operation.op, source });
  }
  if (
    typeof current !== 'number' ||
    !Number.isFinite(current) ||
    !Number.isFinite(operation.value)
  ) {
    throw new Error('Numeric effect requires finite numbers');
  }
  const result = operation.mode === 'add' ? current + operation.value : current * operation.value;
  if (!Number.isFinite(result)) throw new Error('Non-finite numeric result');
  return result;
};

export const materializeCertification = (
  ledger: CertificationLedger,
  suppressedIds: ReadonlySet<string> = new Set()
): Map<string, EffectValue> => {
  const values = new Map(ledger.bases.map(({ target, value }) => [effectTargetKey(target), value]));
  for (const effect of activeCertificationEffects(ledger, suppressedIds)) {
    // Manual root effects provide graph support; their decisions are applied
    // exactly once in the protected resolution layer below.
    if (effect.cause.kind === 'manual') continue;
    const key = effectTargetKey(effect.target);
    if (!values.has(key)) throw new Error('Missing effect base');
    values.set(key, applyEffectOperation(values.get(key)!, effect.operation, effect.id));
  }
  // Protected operator decisions are a resolution layer, not old markers
  // appended before newer automatic ADD/SET operations.
  const released = new Set(ledger.releasedDecisionIds);
  for (const decision of ledger.manualDecisions) {
    if (released.has(decision.id)) continue;
    const key = effectTargetKey(decision.target);
    if (!values.has(key)) throw new Error('Missing manual base');
    values.set(key, applyEffectOperation(values.get(key)!, decision.operation, decision.id));
  }
  return values;
};

export const recordManualDecision = (
  ledger: CertificationLedger,
  decision: ManualDecision
): CertificationLedger => {
  const next = {
    ...ledger,
    revision: ledger.revision + 1,
    manualDecisions: [...ledger.manualDecisions, decision],
  };
  validateCertificationLedger(next);
  // Validate operation types before any caller persists the event.
  materializeCertification(next);
  return next;
};

export const certificationBranchesOf = (
  effects: CertificationEffect[],
  ids: string[]
): Set<string> => {
  const byId = new Map(effects.map((effect) => [effect.id, effect]));
  const seen = new Set<string>();
  const branches = new Set<string>();
  const queue = [...ids];
  while (queue.length > 0) {
    const id = queue.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const cause = byId.get(id)?.cause;
    if (cause?.kind === 'certification') branches.add(cause.branchId);
    if (cause?.kind === 'trigger') queue.push(...cause.supports);
  }
  return branches;
};

const candidateLedger = (
  ledger: CertificationLedger,
  run: CertificationRun,
  effects: CertificationEffect[]
): CertificationLedger => ({
  ...ledger,
  runs: [...ledger.runs, run],
  retiredRunIds: [...new Set([...ledger.retiredRunIds, ...run.supersedes])],
  effects: [...ledger.effects, ...effects],
  nextSequence: ledger.nextSequence + effects.length,
});

/**
 * The executor must evaluate against this retired baseline, not today's
 * projection or a restored whole-table snapshot. It must not fire gameplay
 * OnTagRemoved handlers for administrative retirement.
 */
export const certificationReplayBaseline = (
  ledger: CertificationLedger,
  scope: CertificationScope
): CertificationLedger => ({
  ...ledger,
  retiredRunIds: [
    ...new Set([
      ...ledger.retiredRunIds,
      ...ledger.runs.filter((run) => sameScope(run.scope, scope)).map((run) => run.id),
    ]),
  ],
});

export const planCertification = (
  ledger: CertificationLedger,
  run: CertificationRun,
  effects: CertificationEffect[],
  fingerprint: string
): CertificationPlan => {
  validateCertificationLedger(ledger);
  const supersedes = ledger.runs
    .filter(
      (previous) =>
        sameScope(previous.scope, run.scope) && !ledger.retiredRunIds.includes(previous.id)
    )
    .map((previous) => previous.id);
  if (
    supersedes.length !== run.supersedes.length ||
    supersedes.some((id) => !run.supersedes.includes(id))
  ) {
    throw new Error('Replacement scope does not match active runs');
  }
  effects.forEach((effect, index) => {
    if (effect.sequence !== ledger.nextSequence + index) {
      throw new Error('Replacement effects must have consecutive new sequences');
    }
    if (effect.cause.kind === 'certification' && effect.cause.runId !== run.id) {
      throw new Error('Replacement effect belongs to another run');
    }
  });
  const next = candidateLedger(ledger, run, effects);
  validateCertificationLedger(next);
  const current = materializeCertification(ledger);
  const oldBranchByPlayer = new Map(
    ledger.runs
      .filter((previous) => sameScope(previous.scope, run.scope))
      .flatMap((previous) =>
        previous.branches.map((branch) => [branch.id, branch.playerId] as const)
      )
  );
  const newBranchByPlayer = new Map(run.branches.map((branch) => [branch.playerId, branch.id]));
  const activeIds = new Set(activeCertificationEffects(next).map((effect) => effect.id));
  const conflicts: CertificationConflict[] = [];
  for (const decision of ledger.manualDecisions) {
    if (ledger.releasedDecisionIds.includes(decision.id) || decision.overrides.length === 0) {
      continue;
    }
    const oldBranches = certificationBranchesOf(ledger.effects, decision.overrides);
    const replacementBranches = new Set(
      [...oldBranches]
        .map((id) => newBranchByPlayer.get(oldBranchByPlayer.get(id) ?? ''))
        .filter((id): id is string => !!id)
    );
    const relevant = [...oldBranches].some((id) => oldBranchByPlayer.has(id));
    if (!relevant) continue;
    const key = effectTargetKey(decision.target);
    const primary = ledger.effects.some(
      (effect) => decision.overrides.includes(effect.id) && effect.primary
    );
    const proposedEffects = effects.filter(
      (effect) =>
        activeIds.has(effect.id) &&
        (effectTargetKey(effect.target) === key ||
          (primary &&
            [...certificationBranchesOf(next.effects, [effect.id])].some((id) =>
              replacementBranches.has(id)
            )))
    );
    // Retirement itself may undo the result an operator explicitly asserted,
    // even when the replacement submission is absent or writes elsewhere.
    const proposed = materializeCertification({
      ...next,
      releasedDecisionIds: [...new Set([...next.releasedDecisionIds, decision.id])],
    });
    conflicts.push({
      decisionId: decision.id,
      target: decision.target,
      previousEffectIds: [...decision.overrides],
      proposedEffectIds: proposedEffects.map((effect) => effect.id),
      branchIds: primary ? [...replacementBranches] : [],
      currentValue: current.get(key)!,
      proposedValue: proposed.get(key)!,
    });
  }
  return {
    namespace: ledger.namespace,
    expectedRevision: ledger.revision,
    expectedFingerprint: fingerprint,
    run,
    effects,
    conflicts,
  };
};

export const resolveCertificationPlan = (
  ledger: CertificationLedger,
  plan: CertificationPlan,
  choices: Record<string, ConflictChoice>,
  fingerprint: string
): CertificationLedger => {
  if (
    ledger.namespace !== plan.namespace ||
    ledger.revision !== plan.expectedRevision ||
    fingerprint !== plan.expectedFingerprint
  ) {
    throw new Error('Certification data changed; re-plan and review again');
  }
  // Never trust a stale or caller-modified conflict list.
  const verified = planCertification(ledger, plan.run, plan.effects, fingerprint);
  for (const conflict of verified.conflicts) {
    if (choices[conflict.decisionId] !== 'keep' && choices[conflict.decisionId] !== 'replace') {
      throw new Error('Every manual override needs an explicit decision');
    }
  }
  const suppressed = new Set<string>();
  const keptBranches = new Set(
    verified.conflicts
      .filter((conflict) => choices[conflict.decisionId] === 'keep')
      .flatMap((conflict) => conflict.branchIds)
  );
  for (const effect of plan.effects) {
    if (effect.cause.kind === 'certification' && keptBranches.has(effect.cause.branchId)) {
      suppressed.add(effect.id);
    }
  }
  // Keep rejected proposals for audit. Reachability removes descendants with
  // no remaining support, while shared independently rooted effects survive.
  let next = candidateLedger(ledger, plan.run, plan.effects);
  next = {
    ...next,
    revision: ledger.revision + 1,
    suppressedEffectIds: [...new Set([...ledger.suppressedEffectIds, ...suppressed])],
    releasedDecisionIds: [
      ...new Set([
        ...ledger.releasedDecisionIds,
        ...verified.conflicts
          .filter((conflict) => choices[conflict.decisionId] === 'replace')
          .map((conflict) => conflict.decisionId),
      ]),
    ],
    resolutions: [
      ...ledger.resolutions,
      {
        runId: plan.run.id,
        decisions: verified.conflicts.map((conflict) => ({
          decisionId: conflict.decisionId,
          choice: choices[conflict.decisionId],
        })),
      },
    ],
  };
  const accepted = new Set(activeCertificationEffects(next).map((effect) => effect.id));
  if (
    plan.effects.some(
      (effect) => accepted.has(effect.id) && effect.readEffectIds?.some((id) => !accepted.has(id))
    )
  ) {
    throw new Error('Override choices changed an execution dependency; re-plan before committing');
  }
  validateCertificationLedger(next);
  materializeCertification(next);
  return next;
};
