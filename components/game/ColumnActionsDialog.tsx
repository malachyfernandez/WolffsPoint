import React, { useState } from 'react';
import { View } from 'react-native';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import DialogHeader from '../ui/dialog/DialogHeader';
import Column from '../layout/Column';
import Row from '../layout/Row';
import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import DeleteConfirmationDialog from './DeleteRoleConfirmationDialog';
import { ColumnSizeOption } from './playerTableColumnSizing';
import CloseButton from '../ui/dialog/CloseButton';
import type { CellContentType } from '../../types/playerTable';

interface ColumnActionsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  selectedSize: ColumnSizeOption;
  onSelectSize: (size: ColumnSizeOption) => void;
  onDelete?: () => void;
  contentType?: CellContentType;
  onSelectContentType?: (type: CellContentType) => void;
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
  contentType = 'tags',
  onSelectContentType,
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
            <CloseButton onPress={() => onOpenChange(false)} />
            <DialogHeader text={title} />
            <Column className="gap-3 p-0 pt-4 sm:p-5">
              {onSelectContentType && (
                <Column className="gap-2">
                  <FontText weight="medium">Cell content</FontText>
                  <Row className="gap-2">
                    {(['tags', 'files'] as const).map((type) => (
                      <AppButton
                        key={type}
                        className="flex-1"
                        variant={contentType === type ? 'filled' : 'outline'}
                        onPress={() => onSelectContentType(type)}>
                        <FontText color={contentType === type ? 'white' : undefined}>
                          {type === 'tags' ? 'Tags' : 'Files'}
                        </FontText>
                      </AppButton>
                    ))}
                  </Row>
                  <FontText variant="subtext" className="text-xs">
                    {contentType === 'tags'
                      ? 'Choose tags only.'
                      : 'Compose cells from reusable markdown and script files.'}
                    {' Existing content is kept when switching types.'}
                  </FontText>
                </Column>
              )}
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

              {onDelete ? (
                <AppButton
                  className="mt-2 w-full justify-center px-4"
                  variant="red"
                  onPress={() => setIsDeleteConfirmOpen(true)}>
                  <FontText weight="medium" color="red-700">
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
