import { useValue } from './useData';

export interface SavedEntry {
    id: string;
    savedAt: number;
    preview: string;
    value: any;
}

const MAX_SAVES = 5;

/**
 * Hook for managing save history of a dialog's content.
 * Stores up to MAX_SAVES entries (newest first) in a PRIVATE user variable.
 *
 * @param historyKey - A scoped key like `saveHistory-markdownEditor-{gameId}-{roleName}`
 */
export function useSaveHistory(historyKey: string | null) {
    // Prefix with 'saveHistory:' to avoid collisions with other data keys
    const storageKey = historyKey ? `saveHistory:${historyKey}` : '__saveHistory_unused__';
    const [historyRecord, setHistory] = useValue<SavedEntry[]>(storageKey, {
        defaultValue: [],
        privacy: 'PRIVATE',
    });

    const history: SavedEntry[] = historyRecord?.value ?? [];

    const addSave = (value: any, preview: string) => {
        const current = historyRecord?.value ?? [];
        // Skip if the new value matches the most recent save (deduplicate)
        if (current.length > 0 && JSON.stringify(current[0].value) === JSON.stringify(value)) {
            return;
        }
        const entry: SavedEntry = {
            id: `${Date.now()}`,
            savedAt: Date.now(),
            preview: preview.slice(0, 200),
            value,
        };
        const next = [entry, ...current].slice(0, MAX_SAVES);
        setHistory(next);
    };

    const removeSave = (id: string) => {
        const current = historyRecord?.value ?? [];
        const next = current.filter((e: SavedEntry) => e.id !== id);
        setHistory(next);
    };

    const clearHistory = () => {
        setHistory([]);
    };

    return { history, addSave, removeSave, clearHistory, maxSaves: MAX_SAVES };
}
