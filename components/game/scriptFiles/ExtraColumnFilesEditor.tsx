import React from 'react';
import { useScriptFiles } from '../../../hooks/useScriptFiles';
import CellFilesEditorDialog from './CellFilesEditorDialog';

export default function ExtraColumnFilesEditor({
  isOpen,
  onOpenChange,
  gameId,
  value,
  onChange,
  title,
  historyKey,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  gameId: string;
  value: string;
  onChange: (value: string) => void;
  title: string;
  historyKey?: string;
}) {
  const filesApi = useScriptFiles(gameId);
  return (
    <CellFilesEditorDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={title}
      cellText={value}
      onSubmitText={onChange}
      filesApi={filesApi}
      pinnedFolder=""
      gameId={gameId}
      forceFiles
      hideInputs
      historyKey={historyKey}
    />
  );
}
