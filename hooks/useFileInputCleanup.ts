import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useList, useValue } from './useData';
import { useSim } from '../contexts/SimContext';
import { useToast } from '../contexts/ToastContext';
import { getGameScopedKey } from '../utils/multiplayer';
import { useCellModuleStatus } from '../utils/legacySystems';
import type { RuleBookData } from '../types/ruleBook';
import {
  buildFilesIndex,
  emptyScriptFilesDoc,
  type ScriptFilesDoc,
  type ScriptFilesIndex,
} from '../utils/scriptFiles';
import {
  cleanupFileInputContent,
  cleanupFileInputRoles,
  cleanupFileInputUserTable,
  hasRemovedFileInputs,
} from '../utils/fileInputCleanup';
import {
  cleanupDeletedTagContent,
  cleanupDeletedTagRoles,
  cleanupDeletedTagUserTable,
  liveTagNameSet,
  removedTagDefs,
  removedTagFiles,
  type RemovedTag,
} from '../utils/deletedTagCleanup';
import type { UserVariableResult } from './useUserVariable';
import type { ScheduledValueSetter } from './useScheduledUpdates';
import type { UserTableItem } from '../types/playerTable';
import type { RoleTableItem } from '../types/roleTable';

/** Observe explicit schema removals, then repair active references without manual ownership. */
export const useFileInputCleanup = (gameId: string) => {
  const sim = useSim();
  const scope = `${gameId}|${sim.mode}|${sim.realGameId}|${sim.personaId}`;
  const { showToast } = useToast();
  const { displayModules } = useCellModuleStatus(gameId);
  const [files] = useValue<ScriptFilesDoc>(getGameScopedKey('scriptFiles', gameId), {
    defaultValue: emptyScriptFilesDoc(),
    privacy: 'PUBLIC',
    autoCreate: false,
  });
  const index = useMemo(() => buildFilesIndex(files.value), [files.value]);
  const filesReady =
    !files.state.isSyncing && !['pending', 'timed_out'].includes(files.state.lastOpStatus ?? '');
  const previous = useRef<{ scope: string; index: ScriptFilesIndex } | null>(null);
  const [armedScope, setArmedScope] = useState<string | null>(null);
  const enabled = armedScope === scope;
  const options = {
    enabled,
    autoCreate: false,
    overwriteStoredConfig: false,
    overwriteStoredPrivacy: false,
  };
  const [users, setUsers] = useList<UserTableItem[]>('userTable', gameId, options);
  const [roles, setRoles] = useList<RoleTableItem[]>('roleTable', gameId, options);
  const [morning, setMorning] = useList<Record<string, string[]>>(
    'morningMessagesList',
    gameId,
    options
  );
  const [vote, setVote] = useList<string>('voteMessageDefault', gameId, options);
  const [newspaper, setNewspaper] = useList('newspaper', gameId, options);
  const [triggers, setTriggers] = useValue(getGameScopedKey('tagTriggers', gameId), options);
  const [tagDefs] = useValue<{ name: string }[]>(
    getGameScopedKey('tagDefinitions', gameId),
    options
  );
  const [ruleBook, setRuleBook] = useValue<RuleBookData>(
    getGameScopedKey('ruleBook', gameId),
    options
  );
  const attempts = useRef(new Map<string, { value: unknown; index: ScriptFilesIndex }>());

  const cleanRuleBook = useCallback(
    (value: RuleBookData, nextIndex: ScriptFilesIndex): RuleBookData => {
      if (!displayModules) return cleanupFileInputContent(value, nextIndex);
      const modularContent =
        value.modularContent === undefined
          ? undefined
          : cleanupFileInputContent(value.modularContent, nextIndex);
      return modularContent === value.modularContent ? value : { ...value, modularContent };
    },
    [displayModules]
  );

  /** Tag removals detected so far in this scope (files deleted/moved out of
   *  `tags/` plus dropped legacy tagDefinitions). Accumulates so consecutive
   *  deletions each get cleaned even while already armed. */
  const removedTags = useRef<RemovedTag[]>([]);
  const previousDefs = useRef<{ scope: string; defs: { name: string }[] | undefined } | null>(null);

  const defsReady =
    !tagDefs.state.isSyncing &&
    !['pending', 'timed_out'].includes(tagDefs.state.lastOpStatus ?? '');

  useEffect(() => {
    if (!filesReady || !defsReady) return;
    const prev = previous.current;
    const sameScope = prev?.scope === scope;
    const defsPrev = previousDefs.current;
    const sameDefsScope = defsPrev?.scope === scope;
    if (!sameScope || !sameDefsScope) removedTags.current = [];
    const removed: RemovedTag[] = [
      ...(sameScope && prev ? removedTagFiles(prev.index, index) : []),
      ...(sameDefsScope ? removedTagDefs(defsPrev?.defs, tagDefs.value) : []),
    ];
    if (removed.length) {
      const known = new Set(
        removedTags.current.map((t) => `${t.id ?? ''}|${t.name.toLowerCase()}`)
      );
      removedTags.current.push(
        ...removed.filter((t) => !known.has(`${t.id ?? ''}|${t.name.toLowerCase()}`))
      );
    }
    if (sameScope && prev && (removed.length || hasRemovedFileInputs(prev.index, index))) {
      setArmedScope(scope);
    }
    previous.current = { scope, index };
    previousDefs.current = { scope, defs: tagDefs.value };
  }, [scope, index, filesReady, defsReady, tagDefs.value]);

  useEffect(() => {
    if (!enabled || !filesReady) return;
    const repair = <T>(
      key: string,
      record: UserVariableResult<T>,
      setter: ScheduledValueSetter<T>,
      clean: (value: T, index: ScriptFilesIndex) => T
    ) => {
      if (
        !record ||
        record.state.isSyncing ||
        ['pending', 'timed_out'].includes(record.state.lastOpStatus ?? '') ||
        record.scheduledUpdate?.status === 'scheduled'
      )
        return;
      const value = record.scheduledUpdate?.value ?? record.value;
      if (value === undefined || value === null) return;
      const tagVersion = removedTags.current.map((t) => t.id ?? t.name).join('|');
      const last = attempts.current.get(`${scope}:${key}:${tagVersion}`);
      if (last?.value === value && last.index === index) return;
      const next = clean(value, index);
      if (next === value) return;
      attempts.current.set(`${scope}:${key}:${tagVersion}`, { value, index });
      const staged = record.scheduledUpdate;
      Promise.resolve(
        setter(next, {
          cellWriteOrigin: 'tracked',
          ...(staged ? { stage: true, batchId: staged.batchId } : {}),
        })
      ).catch(() =>
        showToast('Could not clean removed file inputs. Please retry saving the file.')
      );
    };
    const removed = removedTags.current;
    const liveNames = liveTagNameSet(index, tagDefs.value);
    repair('users', users, setUsers, (v, i) =>
      cleanupDeletedTagUserTable(cleanupFileInputUserTable(v, i), removed, liveNames)
    );
    repair('roles', roles, setRoles, (v, i) =>
      cleanupDeletedTagRoles(cleanupFileInputRoles(v, i), removed, liveNames)
    );
    repair('morning', morning, setMorning, (v, i) =>
      cleanupDeletedTagContent(cleanupFileInputContent(v, i), removed, liveNames)
    );
    repair('vote', vote, setVote, (v, i) =>
      cleanupDeletedTagContent(cleanupFileInputContent(v, i), removed, liveNames)
    );
    repair('newspaper', newspaper, setNewspaper, (v, i) =>
      cleanupDeletedTagContent(cleanupFileInputContent(v, i), removed, liveNames)
    );
    repair('triggers', triggers, setTriggers, (v, i) =>
      cleanupDeletedTagContent(cleanupFileInputContent(v, i), removed, liveNames)
    );
    repair('ruleBook', ruleBook, setRuleBook, (v, i) =>
      cleanupDeletedTagContent(cleanRuleBook(v, i), removed, liveNames)
    );
  }, [
    enabled,
    scope,
    index,
    filesReady,
    users,
    roles,
    morning,
    vote,
    newspaper,
    triggers,
    ruleBook,
    tagDefs,
    cleanRuleBook,
    setUsers,
    setRoles,
    setMorning,
    setVote,
    setNewspaper,
    setTriggers,
    setRuleBook,
    showToast,
  ]);
};
