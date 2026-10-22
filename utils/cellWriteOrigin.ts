let restoring = false;

export const isRestoringCellWrites = () => restoring;

/** Undo restores an attributed snapshot; it is not a fresh operator decision. */
export const withRestoredCellWrites = (restore: () => void) => {
  const previous = restoring;
  restoring = true;
  try {
    restore();
  } finally {
    restoring = previous;
  }
};
