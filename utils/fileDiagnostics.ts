import type { Statement } from '../script/lang/ast';
import type { UserTableTitle } from '../types/playerTable';
import {
  collectFileInputNames,
  collectSourceFileRefs,
  fileStatements,
  isTagFile,
  isTriggerFile,
  parseFileSource,
  resolveFileRef,
  validateFileReferences,
  type ScriptFile,
  type ScriptFilesIndex,
} from './scriptFiles';
import { lintCellColumnTypes, lintScriptStatements } from './scriptLint';

/**
 * Cross-file diagnostics: every problem a file's source has INCLUDING the
 * ones caused by changes it didn't make - a referenced file deleted,
 * renamed, or role-flipped, an input dropped from a callee's contract, a
 * tag renamed, a table column removed, or an include cycle formed by an
 * edit elsewhere.
 *
 * The heavy inputs are all cached: `fileStatements` parses once per
 * (fileId, updatedAt), and the referrer→referenced edge walk reuses the
 * same parse cache, so a rebuild is O(total statements) with zero parses.
 * `collectFileInputNames` only runs for files that actually contain an
 * `Inputs.entry(` call, skipping the transitive include-closure expansion
 * for everything else.
 */

const fileLintStatements = (file: ScriptFile): Statement[] => {
  const statements = fileStatements(file);
  /* The tag meta header is editor-managed, not a lintable block - the
   * editors strip it before linting, so do the same here. */
  return isTagFile(file) && statements[0]?.kind === 'TagStatement'
    ? statements.slice(1)
    : statements;
};

/** referrerId → referenced fileIds (File() calls, folder-expanded members,
 *  cell-op File() values - everything collectSourceFileRefs sees). */
const collectForwardEdges = (index: ScriptFilesIndex): Map<string, Set<string>> => {
  const forward = new Map<string, Set<string>>();
  const add = (from: string, to: string) => {
    if (from === to) return;
    const set = forward.get(from);
    if (set) set.add(to);
    else forward.set(from, new Set([to]));
  };
  for (const file of index.byId.values()) {
    for (const ref of collectSourceFileRefs(file, index)) {
      const target = resolveFileRef(index, ref);
      if (target) add(file.id, target.id);
    }
  }
  return forward;
};

/** Every fileId that sits on an include cycle or includes one (expansion
 *  breaks for both). Three-color DFS over the edge graph - O(edges). */
const collectCycleMembers = (forward: Map<string, Set<string>>): Set<string> => {
  const color = new Map<string, 0 | 1 | 2>(); // 0 unvisited implicit, 1 on stack, 2 done
  const stack: string[] = [];
  const onCycle = new Set<string>();
  const dfs = (id: string) => {
    color.set(id, 1);
    stack.push(id);
    for (const next of forward.get(id) ?? []) {
      if (color.get(next) === 1) {
        /* back edge: everything on the stack from `next` down is a cycle */
        for (let i = stack.indexOf(next); i < stack.length; i++) onCycle.add(stack[i]);
      } else if (!color.has(next)) {
        dfs(next);
      }
    }
    stack.pop();
    color.set(id, 2);
  };
  for (const id of forward.keys()) if (!color.has(id)) dfs(id);
  if (onCycle.size === 0) return onCycle;
  /* Files that include a cycle member break at expansion too - propagate
   * upstream through the reverse edges. */
  const reverse = new Map<string, Set<string>>();
  for (const [from, tos] of forward) for (const to of tos) {
    const set = reverse.get(to);
    if (set) set.add(from);
    else reverse.set(to, new Set([from]));
  }
  const queue = [...onCycle];
  const upstream = new Set(onCycle);
  while (queue.length > 0) {
    const id = queue.pop()!;
    for (const prev of reverse.get(id) ?? []) {
      if (!upstream.has(prev)) {
        upstream.add(prev);
        queue.push(prev);
      }
    }
  }
  return upstream;
};

/**
 * Build `fileId → messages` for every file in the index. Files with no
 * problems are absent from the map.
 */
export const buildFileDiagnostics = (
  index: ScriptFilesIndex,
  titles?: UserTableTitle
): Map<string, string[]> => {
  const out = new Map<string, string[]>();
  const push = (id: string, message: string) => {
    const list = out.get(id);
    if (list) {
      if (!list.includes(message)) list.push(message);
    } else out.set(id, [message]);
  };

  /* Include cycles are a graph property, not a per-file one - compute once
   *  over the edge map and flag every file that expands into a cycle. */
  const cycleMembers = collectCycleMembers(collectForwardEdges(index));
  for (const id of cycleMembers) {
    push(id, 'Circular file reference');
  }

  for (const file of index.byId.values()) {
    const parsed = parseFileSource(file);
    if (!parsed) {
      push(file.id, 'Source could not be parsed');
      continue;
    }
    for (const d of parsed.diagnostics) {
      if (d.severity === 'error') push(file.id, d.message);
    }
    const statements = fileLintStatements(file);
    /* Inputs.entry("x") key checks need the transitive input contract, which
     *  walks the include closure - skip it for files with no entry calls. */
    const knownInputNames = /inputs(?:withdata)?\.entry\s*\(/i.test(file.source)
      ? collectFileInputNames(statements, index)
      : [];
    for (const flag of validateFileReferences(statements, index, knownInputNames)) {
      push(file.id, flag.message);
    }
    for (const flag of lintScriptStatements(statements, {
      isTrigger: isTriggerFile(file),
      isTagFile: isTagFile(file),
      index,
    })) {
      push(file.id, flag.message);
    }
    for (const flag of lintCellColumnTypes(statements, titles, index)) {
      push(file.id, flag.message);
    }
  }
  return out;
};
