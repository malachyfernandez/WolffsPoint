import React, { useState } from 'react';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import DialogHeader from '../ui/dialog/DialogHeader';
import { CloseButton } from '../ui/dialog/CloseButton';
import ConfirmDialog from '../ui/dialog/ConfirmDialog';
import ShadowScrollView from '../ui/ShadowScrollView';
import FontText from '../ui/text/FontText';
import AppButton from '../ui/buttons/AppButton';
import Column from '../layout/Column';
import Row from '../layout/Row';
import type { LiveChoices, LiveConflict } from '../../utils/liveCertification';
import { previewCellText } from '../../utils/cellPieces';
import { useScriptFilesReader } from '../../hooks/useScriptFiles';

export default function CertificationReviewDialog({
  conflicts,
  busy,
  onCancel,
  onConfirm,
  gameId,
}: {
  conflicts: LiveConflict[];
  busy: boolean;
  gameId: string;
  onCancel: () => void;
  onConfirm: (choices: LiveChoices) => void;
}) {
  const [choices, setChoices] = useState<LiveChoices>({});
  const [discardOpen, setDiscardOpen] = useState(false);
  const { index } = useScriptFilesReader(gameId);
  const close = () => {
    if (busy) return;
    if (Object.keys(choices).length) setDiscardOpen(true);
    else onCancel();
  };
  const chooseAll = (choice: 'keep' | 'replace') =>
    setChoices(Object.fromEntries(conflicts.map((conflict) => [conflict.id, choice])));
  return (
    <>
      <ConvexDialog.Root
        isOpen
        onOpenChange={(open: boolean) => {
          if (!open) close();
        }}>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="max-h-[85vh] max-w-2xl p-4" isSwipeable={false}>
            <CloseButton onPress={close} />
            <DialogHeader
              text="Review certification changes"
              subtext="Choose which operator changes to keep before certifying again."
              style={{ paddingRight: 64 }}
            />
            <Row className="flex-wrap gap-2 pb-3">
              <AppButton className="px-3" disabled={busy} onPress={() => chooseAll('keep')}>
                <FontText>Keep all</FontText>
              </AppButton>
              <AppButton className="px-3" disabled={busy} onPress={() => chooseAll('replace')}>
                <FontText>Use all new results</FontText>
              </AppButton>
            </Row>
            <ShadowScrollView className="min-h-0 shrink">
              <Column className="gap-3 py-2">
                {conflicts.map((conflict) => (
                  <Column
                    key={conflict.id}
                    className="border-subtle-border gap-2 rounded-lg border p-3">
                    <FontText weight="bold">
                      {conflict.player}: {conflict.column}
                      {conflict.day === null ? '' : `, Day ${conflict.day + 1}`}
                    </FontText>
                    <FontText>
                      Current: {previewCellText(conflict.current, index) || 'Empty'}
                    </FontText>
                    <FontText>New: {previewCellText(conflict.proposed, index) || 'Empty'}</FontText>
                    {conflict.primary && (
                      <FontText variant="subtext">
                        Keeping this vote/action also skips that submission&apos;s new script
                        effects.
                      </FontText>
                    )}
                    <Row className="flex-wrap gap-2">
                      <AppButton
                        className="px-3"
                        disabled={busy}
                        variant={choices[conflict.id] === 'keep' ? 'black' : 'outline'}
                        onPress={() =>
                          setChoices((current) => ({ ...current, [conflict.id]: 'keep' }))
                        }>
                        <FontText color={choices[conflict.id] === 'keep' ? 'white' : undefined}>
                          Keep current
                        </FontText>
                      </AppButton>
                      <AppButton
                        className="px-3"
                        disabled={busy}
                        variant={choices[conflict.id] === 'replace' ? 'black' : 'outline'}
                        onPress={() =>
                          setChoices((current) => ({ ...current, [conflict.id]: 'replace' }))
                        }>
                        <FontText color={choices[conflict.id] === 'replace' ? 'white' : undefined}>
                          Use certification
                        </FontText>
                      </AppButton>
                    </Row>
                  </Column>
                ))}
              </Column>
            </ShadowScrollView>
            <Row className="justify-end gap-3 pt-3">
              <AppButton className="px-3" disabled={busy} onPress={close}>
                <FontText>Cancel</FontText>
              </AppButton>
              <AppButton
                className="px-3"
                disabled={busy || conflicts.some((conflict) => !choices[conflict.id])}
                variant="black"
                onPress={() => onConfirm(choices)}>
                <FontText color="white">{busy ? 'Saving...' : 'Certify'}</FontText>
              </AppButton>
            </Row>
          </ConvexDialog.Content>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>
      <ConfirmDialog
        isOpen={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Discard review choices?"
        message="No certification changes have been saved."
        confirmLabel="Discard"
        onConfirm={onCancel}
      />
    </>
  );
}
