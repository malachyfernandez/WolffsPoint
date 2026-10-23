import React, { useCallback, useEffect, useState } from 'react';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import AppButton from '../../ui/buttons/AppButton';
import FontText from '../../ui/text/FontText';
import ConvexDialog from '../../ui/dialog/ConvexDialog';
import DialogHeader from '../../ui/dialog/DialogHeader';
import CloseButton from '../../ui/dialog/CloseButton';
import { useKeyboardShortcuts } from 'hooks/useKeyboardShortcuts';
import { useSim } from 'contexts/SimContext';
import { SimEditWarningContext } from 'contexts/SimEditWarningContext';

/**
 * Pops a one-line "this is a simulation" flag the first time a guarded edit
 * (file creation, role table writes) happens inside the sim. "Don't warn
 * again" suppresses it for the rest of the session; because this provider
 * lives inside SimProvider, pausing or ending the sim unmounts it and the
 * warning comes back next session.
 */
const SimEditWarningProvider = ({ children }: { children: React.ReactNode }) => {
  const sim = useSim();
  const [isOpen, setIsOpen] = useState(false);
  const [suppressed, setSuppressed] = useState(false);

  // Belt and suspenders for the unmount reset: if the sim view ever flips off
  // without a remount, the suppression clears here too.
  useEffect(() => {
    if (sim.mode === 'off') {
      setIsOpen(false);
      setSuppressed(false);
    }
  }, [sim.mode]);

  const warn = useCallback(() => {
    if (sim.mode !== 'off' && !suppressed) setIsOpen(true);
  }, [sim.mode, suppressed]);

  const handleSuppress = () => {
    setSuppressed(true);
    setIsOpen(false);
  };

  useKeyboardShortcuts({
    onPrimaryAction: () => setIsOpen(false),
    onClose: () => setIsOpen(false),
    enabled: isOpen,
  });

  return (
    <SimEditWarningContext.Provider value={warn}>
      {children}
      <ConvexDialog.Root isOpen={isOpen} onOpenChange={setIsOpen}>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="max-w-sm p-6" isSwipeable={false}>
            <CloseButton onPress={() => setIsOpen(false)} accessibilityLabel="Close" />
            <DialogHeader text="Simulation only" />
            <Column className="gap-4">
              <FontText className="text-center">Nothing here affects the real game.</FontText>
              <Row className="justify-center gap-3 pt-2">
                <AppButton variant="outline" onPress={handleSuppress}>
                  <FontText weight="medium" className="text-xs">
                    Don&apos;t warn again
                  </FontText>
                </AppButton>
                <AppButton
                  variant="filled"
                  className="w-20"
                  onPress={() => setIsOpen(false)}
                  keyboardHint={['enter']}>
                  <FontText weight="medium" color="white">
                    Got it
                  </FontText>
                </AppButton>
              </Row>
            </Column>
          </ConvexDialog.Content>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>
    </SimEditWarningContext.Provider>
  );
};

export default SimEditWarningProvider;
