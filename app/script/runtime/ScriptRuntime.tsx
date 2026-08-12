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

const decodeInputState = (state: Record<string, string | undefined> = {}): Record<string, unknown> => Object.fromEntries(
    Object.entries(state).map(([key, value]) => {
        if (value?.startsWith('[') || value?.startsWith('{')) {
            try {
                return [key, JSON.parse(value)];
            } catch {
                return [key, value];
            }
        }
        return [key, value];
    }),
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
    const result = useMemo(() => interpretScript(ast, {
        globals: {
            ...createScriptGlobals(sources),
            Inputs: inputState,
        },
        inputState,
    }), [ast, inputState, sources]);

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

export default ScriptRuntime;
