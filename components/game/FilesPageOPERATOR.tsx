import React, { useState } from 'react';
import Column from '../layout/Column';
import { useScriptFiles } from '../../hooks/useScriptFiles';
import { useFilePlacements } from '../../hooks/useFilePlacements';
import { useFileDiagnostics } from '../../hooks/useFileDiagnostics';
import { FileBrowserContent } from './scriptFiles/FileBrowserDialog';
import FileEditorDialog from './scriptFiles/FileEditorDialog';
import InputOptionsProvider from './markdownEditor/InputOptionsProvider';
import { useFileEditorHost } from './scriptFiles/FileEditorHostContext';
import type { FilePlacement, ScriptFile } from '../../utils/scriptFiles';

interface FilesPageOPERATORProps {
  gameId: string;
  /** Placement chips on cells jump to the tab holding that cell, the
   *  placement rides along so the cell can flash + scroll into view. */
  onNavigateTab?: (tab: 'config' | 'players' | 'rulebook', placement?: FilePlacement) => void;
}

/**
 * Operator Files tab: the file browser as a page instead of a modal. File
 * rows show where they're placed (cells + other files) and flag files with
 * no reference chain back to a real cell. Tapping a file stacks the same
 * FileEditorDialog the cell pickers use.
 */
const FilesPageOPERATOR = ({ gameId, onNavigateTab }: FilesPageOPERATORProps) => {
  const filesApi = useScriptFiles(gameId);
  const placements = useFilePlacements(gameId, filesApi.index);
  const diagnostics = useFileDiagnostics(gameId, filesApi.index);
  const host = useFileEditorHost();
  const [openFile, setOpenFile] = useState<ScriptFile | null>(null);

  // Hosted above the tabs when the FileEditorHost is present (operator game
  // page): the editor survives tab switches and can minimize.
  const openEditor = (file: ScriptFile) =>
    host ? host.openFile(file.id) : setOpenFile(file);

  /** Chips: file placements open the file here; cell placements jump to the
   *  tab that owns the cell (Roles for role/vote cells, Players for mornings). */
  const handleNavigate = (p: FilePlacement) => {
    if (p.kind === 'file') {
      const target = filesApi.index.byId.get(p.fileId ?? '') ?? null;
      if (target) openEditor(target);
      return;
    }
    onNavigateTab?.(
      p.cellKind === 'ruleBook'
        ? 'rulebook'
        : p.cellKind === 'morningMessage' || p.cellKind === 'tableCell'
          ? 'players'
          : 'config',
      p
    );
  };

  return (
    <>
      <Column className="gap-3">
        <FileBrowserContent
          filesApi={filesApi}
          mode="manage"
          placements={placements}
          diagnostics={diagnostics}
          onNavigate={handleNavigate}
          onOpenFile={openEditor}
        />
      </Column>

      {openFile && (
        <InputOptionsProvider gameId={gameId} showInputs>
          <FileEditorDialog
            isOpen
            onOpenChange={(open) => {
              if (!open) setOpenFile(null);
            }}
            fileId={openFile.id}
            filesApi={filesApi}
            gameId={gameId}
          />
        </InputOptionsProvider>
      )}
    </>
  );
};

export default FilesPageOPERATOR;
