import { useCallback, useMemo } from 'react';
import { useValue } from './useData';

/** A user-saved function, stored as printed source so it can be re-parsed. */
export interface SavedFunction {
  name: string;
  /** Printed function source text (parseable by parseScript). */
  source: string;
  savedAt: number;
}

/**
 * Manages user-saved custom functions persisted via the DataProvider system
 * (Convex-backed, per-user). Saved functions appear in the InsertModal
 * alongside built-in functions and are inserted the same way (appended to
 * the end of the script).
 */
export function useSavedFunctions() {
  const [record, setRecord] = useValue<SavedFunction[]>('savedFunctions', {
    defaultValue: [],
    privacy: 'PRIVATE',
  });

  const savedFunctions = useMemo(() => record?.value ?? [], [record?.value]);

  const saveFunction = useCallback(
    (name: string, source: string) => {
      const current = record?.value ?? [];
      // Replace if a function with the same name already exists.
      const filtered = current.filter((fn) => fn.name !== name);
      setRecord([...filtered, { name, source, savedAt: Date.now() }]);
    },
    [record?.value, setRecord]
  );

  const unsaveFunction = useCallback(
    (name: string) => {
      const current = record?.value ?? [];
      setRecord(current.filter((fn) => fn.name !== name));
    },
    [record?.value, setRecord]
  );

  const savedFunctionNames = useMemo(
    () => savedFunctions.map((fn) => fn.name),
    [savedFunctions]
  );

  return {
    savedFunctions,
    savedFunctionNames,
    saveFunction,
    unsaveFunction,
  };
}
