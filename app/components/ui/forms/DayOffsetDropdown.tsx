import React, { useEffect, useState } from 'react';
import { Pressable, TextInput } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import ConvexDialog from '../dialog/ConvexDialog';
import DialogHeader from '../dialog/DialogHeader';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import FontText from '../text/FontText';
import AppButton from '../buttons/AppButton';
import StatusButton from '../StatusButton';

interface DayOffsetDropdownProps {
  /** 0 = on the final day, 1+ = N days before */
  value: number;
  onValueChange: (value: number) => void;
  triggerClassName?: string;
  /** Title shown in the dialog header */
  title?: string;
}

const DayOffsetDropdown = ({
  value,
  onValueChange,
  triggerClassName = '',
  title = 'WHICH DAY?',
}: DayOffsetDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'final' | 'before'>(value > 0 ? 'before' : 'final');
  const [draftOffset, setDraftOffset] = useState(value > 0 ? String(value) : '');

  // Sync local state when the dialog opens
  useEffect(() => {
    if (isOpen) {
      setMode(value > 0 ? 'before' : 'final');
      setDraftOffset(value > 0 ? String(value) : '');
    }
  }, [isOpen, value]);

  const displayLabel =
    value === 0 ? 'On the final day' : value === 1 ? '1 day before' : `${value} days before`;

  const parsedDraft = parseInt(draftOffset, 10);
  const safeDraft = isNaN(parsedDraft) || parsedDraft < 1 ? 1 : Math.min(parsedDraft, 30);

  const hasChange = (mode === 'final' && value !== 0) || (mode === 'before' && value !== safeDraft);

  const handleSave = () => {
    if (mode === 'final') {
      onValueChange(0);
    } else {
      onValueChange(safeDraft);
    }
    setIsOpen(false);
  };

  const handleDraftChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setDraftOffset(cleaned);
  };

  return (
    <ConvexDialog.Root isOpen={isOpen} onOpenChange={setIsOpen}>
      <ConvexDialog.Trigger asChild>
        <Pressable
          className={`border-subtle-border bg-background w-full flex-row items-center justify-between rounded border px-3 py-3 ${triggerClassName}`.trim()}>
          <FontText weight="medium">{displayLabel}</FontText>
          <ChevronDown size={18} color="rgb(46, 41, 37)" />
        </Pressable>
      </ConvexDialog.Trigger>
      <ConvexDialog.Portal>
        <ConvexDialog.Overlay />
        <ConvexDialog.Content className="max-w-sm">
          <ConvexDialog.Close
            iconProps={{ color: 'rgb(246, 238, 219)' }}
            className="bg-text-inverted/10 hover:bg-text-inverted/15 absolute right-0 top-0 z-10 h-10 w-10 rounded-full"
          />
          <Column className="gap-4">
            <DialogHeader text={title} />
            <Column className="gap-2">
              {/* On the final day */}
              <Pressable
                onPress={() => setMode('final')}
                className={`flex-row items-center justify-between rounded-lg border p-3 ${
                  mode === 'final'
                    ? 'border-accent bg-accent/5'
                    : 'border-subtle-border bg-background'
                }`}>
                <FontText weight={mode === 'final' ? 'medium' : 'regular'}>
                  On the final day
                </FontText>
                {mode === 'final' && <FontText className="text-xs opacity-60">✓</FontText>}
              </Pressable>

              {/* Days before */}
              <Pressable
                onPress={() => setMode('before')}
                className={`rounded-lg border p-3 ${
                  mode === 'before'
                    ? 'border-accent bg-accent/5'
                    : 'border-subtle-border bg-background'
                }`}>
                <Row className="items-center justify-between">
                  <FontText weight={mode === 'before' ? 'medium' : 'regular'}>
                    {parsedDraft === 1 ? 'Day before' : 'Days before'}
                  </FontText>
                  {mode === 'before' && <FontText className="text-xs opacity-60">✓</FontText>}
                </Row>
                {mode === 'before' && (
                  <Column className="mt-3 gap-2">
                    <Row className="items-center gap-2">
                      <FontText variant="subtext" className="text-sm">
                        Actions are due
                      </FontText>
                      <TextInput
                        value={draftOffset}
                        onChangeText={handleDraftChange}
                        keyboardType="numeric"
                        placeholder="1"
                        className="border-border/30 w-16 rounded-md border bg-white px-2 py-1 text-center text-sm"
                      />
                      <FontText variant="subtext" className="text-sm">
                        {safeDraft === 1 ? 'day before' : 'days before'}
                      </FontText>
                    </Row>
                    <FontText variant="subtext" className="text-xs">
                      The final day
                    </FontText>
                  </Column>
                )}
              </Pressable>
            </Column>

            {hasChange ? (
              <AppButton className="h-10 w-full" variant="black" onPress={handleSave}>
                <FontText color="white" weight="medium">
                  Save
                </FontText>
              </AppButton>
            ) : (
              <StatusButton buttonText="Save" buttonAltText="No changes" />
            )}
          </Column>
        </ConvexDialog.Content>
      </ConvexDialog.Portal>
    </ConvexDialog.Root>
  );
};

export default DayOffsetDropdown;
