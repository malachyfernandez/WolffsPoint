import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import DialogHeader from '../ui/dialog/DialogHeader';
import Column from '../layout/Column';
import Row from '../layout/Row';
import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import CustomCheckbox from '../ui/CustomCheckbox';
import DeleteConfirmationDialog from './DeleteRoleConfirmationDialog';
import { ColumnSizeOption } from './playerTableColumnSizing';

interface ColumnActionsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  selectedSize: ColumnSizeOption;
  onSelectSize: (size: ColumnSizeOption) => void;
  onDelete?: () => void;
  /** Whether this column is shown in the nightly operator table. */
  showInNightly?: boolean;
  /** Toggle the "show in nightly" setting. Only shown when provided. */
  onToggleShowInNightly?: () => void;
}

const sizeOptions: { value: ColumnSizeOption; label: string; description: string }[] = [
  { value: 'small', label: 'Small', description: 'Default width' },
  { value: 'medium', label: '2x', description: 'Double width' },
  { value: 'large', label: '3x', description: 'Triple width' },
];

const ColumnActionsDialog = ({
  isOpen,
  onOpenChange,
  title,
  selectedSize,
  onSelectSize,
  onDelete,
  showInNightly,
  onToggleShowInNightly,
}: ColumnActionsDialogProps) => {
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  return (
    <>
      <ConvexDialog.Root isOpen={isOpen} onOpenChange={onOpenChange}>
        <ConvexDialog.Trigger asChild>
          <View />
        </ConvexDialog.Trigger>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="max-w-md p-1">
            <ConvexDialog.Close
              iconProps={{ color: 'rgb(246, 238, 219)' }}
              className="bg-text-inverted/10 hover:bg-text-inverted/15 absolute right-0 top-0 z-10 h-10 w-10 rounded-full"
            />
            <DialogHeader text={title} />
            <Column className="gap-3 p-0 pt-4 sm:p-5">
              {sizeOptions.map((option) => (
                <AppButton
                  key={option.value}
                  className="w-full justify-between px-4"
                  variant={selectedSize === option.value ? 'filled' : 'outline'}
                  onPress={() => {
                    onSelectSize(option.value);
                    onOpenChange(false);
                  }}>
                  <Row className="w-full items-center justify-between gap-4">
                    <FontText
                      color={selectedSize === option.value ? 'white' : 'black'}
                      weight="medium">
                      {option.label}
                    </FontText>
                    <FontText
                      color={selectedSize === option.value ? 'white' : 'black'}
                      className={selectedSize === option.value ? 'opacity-80' : 'opacity-50'}>
                      {option.description}
                    </FontText>
                  </Row>
                </AppButton>
              ))}

              {onToggleShowInNightly !== undefined && (
                <Pressable
                  onPress={onToggleShowInNightly}
                  className="flex-row items-center gap-3 px-4 py-2">
                  <CustomCheckbox
                    checked={!!showInNightly}
                    onChange={onToggleShowInNightly}
                    monochrome
                  />
                  <FontText weight="medium">Show in nightly table</FontText>
                </Pressable>
              )}

              {onDelete ? (
                <AppButton
                  className="mt-2 w-full justify-center px-4"
                  variant="red"
                  onPress={() => setIsDeleteConfirmOpen(true)}>
                  <FontText weight="medium" color="red">
                    Delete Column
                  </FontText>
                </AppButton>
              ) : null}
            </Column>
          </ConvexDialog.Content>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>

      {onDelete ? (
        <DeleteConfirmationDialog
          isOpen={isDeleteConfirmOpen}
          onOpenChange={setIsDeleteConfirmOpen}
          onConfirm={() => {
            onDelete?.();
            onOpenChange(false);
          }}
          itemType="Column"
          itemName={title || 'this column'}
        />
      ) : null}
    </>
  );
};

export default ColumnActionsDialog;
