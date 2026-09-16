import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

interface MultiSelectContextValue {
  selectionMode: boolean;
  setSelectionMode: (mode: boolean) => void;
  selectedCells: Set<string>;
  cellType: string | null;
  toggleCell: (cellId: string, cellType: string) => void;
  toggleColumn: (cellIds: string[], cellType: string) => void;
  isCellSelected: (cellId: string) => boolean;
  isColumnAllSelected: (cellIds: string[]) => boolean;
  isCellDisabled: (cellType: string) => boolean;
  clearSelection: () => void;
  exitSelectionMode: () => void;
  /** Register a bulk-edit handler. Returns an unregister function. */
  registerEditHandler: (handler: () => void) => () => void;
  /** Trigger all registered edit handlers (each checks cellType internally). */
  triggerEdit: () => void;
}

const MultiSelectContext = createContext<MultiSelectContextValue | null>(null);

export const MultiSelectProvider = ({ children }: { children: React.ReactNode }) => {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [cellType, setCellType] = useState<string | null>(null);
  const editHandlersRef = useRef<Set<() => void>>(new Set());

  const toggleCell = useCallback(
    (cellId: string, type: string) => {
      setSelectedCells((prev) => {
        const next = new Set(prev);
        if (next.has(cellId)) {
          next.delete(cellId);
          if (next.size === 0) {
            setCellType(null);
          }
        } else {
          // Only allow selecting if no type is locked, or type matches
          if (cellType === null || type === cellType) {
            next.add(cellId);
            if (cellType === null) {
              setCellType(type);
            }
          }
        }
        return next;
      });
    },
    [cellType]
  );

  const toggleColumn = useCallback(
    (cellIds: string[], type: string) => {
      // If type is locked and different, do nothing
      if (cellType !== null && type !== cellType) return;

      setSelectedCells((prev) => {
        const next = new Set(prev);
        const allSelected = cellIds.every((id) => next.has(id));
        if (allSelected) {
          cellIds.forEach((id) => next.delete(id));
          if (next.size === 0) {
            setCellType(null);
          }
        } else {
          cellIds.forEach((id) => next.add(id));
          if (cellType === null) {
            setCellType(type);
          }
        }
        return next;
      });
    },
    [cellType]
  );

  const isCellSelected = useCallback(
    (cellId: string) => selectedCells.has(cellId),
    [selectedCells]
  );

  const isColumnAllSelected = useCallback(
    (cellIds: string[]) => cellIds.length > 0 && cellIds.every((id) => selectedCells.has(id)),
    [selectedCells]
  );

  const isCellDisabled = useCallback(
    (type: string) => cellType !== null && type !== cellType,
    [cellType]
  );

  const clearSelection = useCallback(() => {
    setSelectedCells(new Set());
    setCellType(null);
  }, []);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedCells(new Set());
    setCellType(null);
  }, []);

  const registerEditHandler = useCallback((handler: () => void) => {
    editHandlersRef.current.add(handler);
    return () => {
      editHandlersRef.current.delete(handler);
    };
  }, []);

  const triggerEdit = useCallback(() => {
    editHandlersRef.current.forEach((h) => h());
  }, []);

  return (
    <MultiSelectContext.Provider
      value={{
        selectionMode,
        setSelectionMode,
        selectedCells,
        cellType,
        toggleCell,
        toggleColumn,
        isCellSelected,
        isColumnAllSelected,
        isCellDisabled,
        clearSelection,
        exitSelectionMode,
        registerEditHandler,
        triggerEdit,
      }}>
      {children}
    </MultiSelectContext.Provider>
  );
};

export const useMultiSelect = (): MultiSelectContextValue => {
  const ctx = useContext(MultiSelectContext);
  if (!ctx) {
    throw new Error('useMultiSelect must be used within a MultiSelectProvider');
  }
  return ctx;
};

// Cell ID helpers
export const makeCellId = (
  tableId: string,
  rowIndex: number,
  columnType: string,
  columnIndex?: number
): string => {
  return columnIndex !== undefined
    ? `${tableId}:${rowIndex}:${columnType}:${columnIndex}`
    : `${tableId}:${rowIndex}:${columnType}`;
};

export const parseCellId = (
  cellId: string
): { tableId: string; rowIndex: number; columnType: string; columnIndex?: number } => {
  const parts = cellId.split(':');
  return {
    tableId: parts[0],
    rowIndex: parseInt(parts[1], 10),
    columnType: parts[2],
    columnIndex: parts[3] !== undefined ? parseInt(parts[3], 10) : undefined,
  };
};
