import React, { useMemo } from 'react';
import { parseScript } from '../lang/parser';
import type { Script } from '../lang/ast';
import { interpretScript } from './interpreter';
import { ScriptRenderers } from './renderers';
import { createScriptGlobals, ScriptSourceData } from './sources';

const scriptCache = new Map<string, Script>();

const cachedParse = (source: string): Script => {
  const cached = scriptCache.get(source);
  if (cached) {
    return cached;
  }
  const parsed = parseScript(source);
  if (scriptCache.size >= 100) {
    scriptCache.delete(scriptCache.keys().next().value ?? '');
  }
  scriptCache.set(source, parsed);
  return parsed;
};

const decodeInputState = (
  state: Record<string, string | undefined> = {}
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(state).map(([key, value]) => {
      if (value?.startsWith('[') || value?.startsWith('{')) {
        try {
          return [key, JSON.parse(value)];
        } catch {
          return [key, value];
        }
      }
      return [key, value];
    })
  );

export interface ScriptRuntimeProps {
  source: string;
  state?: Record<string, string | undefined>;
  setState?: (state: Record<string, string | undefined>) => void;
  sources?: ScriptSourceData;
  isInDialog?: boolean;
  renderMarkdown: (markdown: string, key: string) => React.ReactNode;
}

const ScriptRuntime = ({
  source,
  state,
  setState,
  sources,
  isInDialog = false,
  renderMarkdown,
}: ScriptRuntimeProps) => {
  const ast = useMemo(() => cachedParse(source), [source]);
  const inputState = useMemo(() => decodeInputState(state), [state]);
  const result = useMemo(
    () =>
      interpretScript(ast, {
        globals: {
          ...createScriptGlobals(sources),
          Inputs: inputState,
        },
        inputState,
      }),
    [ast, inputState, sources]
  );

  return (
    <ScriptRenderers
      instructions={result.output}
      state={state}
      setState={setState}
      isInDialog={isInDialog}
      renderMarkdown={renderMarkdown}
    />
  );
};

/**
 * Collect all active input keys across multiple script sources.
 * Used by the parent to prune stale state entries that no longer correspond
 * to any rendered input (across ALL script blocks, not just one).
 */
export const collectActiveInputKeys = (
  sources: string[],
  scriptSources?: ScriptSourceData,
  inputState?: Record<string, unknown>
): Set<string> => {
  const keys = new Set<string>();
  const decoded = inputState
    ? Object.fromEntries(
        Object.entries(inputState).map(([key, value]) => {
          if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
            try {
              return [key, JSON.parse(value)];
            } catch {
              return [key, value];
            }
          }
          return [key, value];
        })
      )
    : {};
  for (const source of sources) {
    try {
      const ast = cachedParse(source);
      const result = interpretScript(ast, {
        globals: {
          ...createScriptGlobals(scriptSources),
          Inputs: decoded,
        },
        inputState: decoded,
      });
      for (const instruction of result.output) {
        keys.add(instruction.key);
      }
    } catch {
      // Skip unparseable scripts
    }
  }
  return keys;
};

export default ScriptRuntime;
