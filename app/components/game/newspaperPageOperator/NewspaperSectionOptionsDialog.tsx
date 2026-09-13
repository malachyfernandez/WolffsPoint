import React, { useState } from 'react';
import { View } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { NewspaperDividerStyle, NewspaperTitleFont } from '../../../../types/usepaper';
import {
    NEWSPAPER_DIVIDER_STYLES,
    NEWSPAPER_TITLE_FONTS,
} from '../../../../utils/newspaperSections';
import Row from '../../layout/Row';
import AppButton from '../../ui/buttons/AppButton';
import ConvexDialog from '../../ui/dialog/ConvexDialog';
import CloseButton from '../../ui/dialog/CloseButton';
import DialogHeader from '../../ui/dialog/DialogHeader';
import FontText from '../../ui/text/FontText';
import VisualDropdown from '../../ui/forms/VisualDropdown';
import DeleteConfirmationDialog from '../DeleteRoleConfirmationDialog';
import { useNewspaperFonts } from '../../../../hooks/useNewspaperFonts';

interface NewspaperSectionOptionsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  sectionNumber: number;
  titleFont: NewspaperTitleFont;
  dividerStyle: NewspaperDividerStyle;
  onTitleFontChange: (font: NewspaperTitleFont) => void;
  onDividerStyleChange: (style: NewspaperDividerStyle) => void;
  onDelete: () => void;
  canDelete: boolean;
}

/** Small preview of a heading rendered in the given font. */
const FontPreview = ({ fontFamily, label }: { fontFamily: string; label: string }) => (
  <View className="flex-col gap-0.5">
    <FontText
      weight="bold"
      className="text-lg"
      style={{ fontFamily, fontSize: 18 }}
    >
      The Daily Tribune
    </FontText>
    <FontText variant="subtext">{label}</FontText>
  </View>
);

/** Small visual preview of a divider style. */
const DividerPreview = ({ style, label }: { style: NewspaperDividerStyle; label: string }) => {
  let divider: React.ReactNode;
  if (style === 'doubleThin') {
    divider = (
      <View className="flex-col gap-0.5 w-full">
        <View className="bg-text h-px w-full opacity-80" />
        <View className="bg-text h-px w-full opacity-80" />
      </View>
    );
  } else if (style === 'centeredShort') {
    divider = <View className="bg-text/70 h-px w-2/5 self-center" />;
  } else if (style === 'diamond') {
    divider = (
      <Row className="items-center gap-2 w-full">
        <View className="bg-text h-px flex-1 opacity-80" />
        <View className="bg-text h-1.5 w-1.5 rotate-45" />
        <View className="bg-text h-px flex-1 opacity-80" />
      </Row>
    );
  } else {
    divider = <View className="bg-text/80 h-px w-full" />;
  }

  return (
    <View className="flex-col gap-1 w-full">
      <FontText weight="medium" className="text-sm">{label}</FontText>
      <View className="py-1">{divider}</View>
    </View>
  );
};

const NewspaperSectionOptionsDialog = ({
  isOpen,
  onOpenChange,
  sectionNumber,
  titleFont,
  dividerStyle,
  onTitleFontChange,
  onDividerStyleChange,
  onDelete,
  canDelete,
}: NewspaperSectionOptionsDialogProps) => {
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  useNewspaperFonts();

  const fontOptions = NEWSPAPER_TITLE_FONTS.map((f) => ({
    value: f.value,
    label: f.label,
    preview: <FontPreview fontFamily={f.fontFamily} label={f.label} />,
  }));

  const dividerOptions = NEWSPAPER_DIVIDER_STYLES.map((d) => ({
    value: d.value,
    label: d.label,
    preview: <DividerPreview style={d.value} label={d.label} />,
  }));

  return (
    <>
      <ConvexDialog.Root isOpen={isOpen} onOpenChange={onOpenChange}>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content isSwipeable={false} className="max-w-xl">
            <CloseButton onPress={() => onOpenChange(false)} />
            <DialogHeader
              text={`Section ${sectionNumber} Options`}
              subtext="Customize the heading font and divider style for this section"
            />
            <View className="flex-col gap-5 pt-4">
              <VisualDropdown
                label="Heading Font"
                options={fontOptions}
                value={titleFont}
                onValueChange={(v) => onTitleFontChange(v as NewspaperTitleFont)}
                placeholder="Select a title font"
              />
              <VisualDropdown
                label="Divider Style"
                options={dividerOptions}
                value={dividerStyle}
                onValueChange={(v) => onDividerStyleChange(v as NewspaperDividerStyle)}
                placeholder="Select a divider style"
              />
            </View>
            <View className="border-border/20 mt-5 border-t pt-4">
              <AppButton
                variant="none"
                disabled={!canDelete}
                onPress={() => setIsDeleteConfirmOpen(true)}
                className="w-full">
                <Row className="items-center justify-center gap-2">
                  <Trash2 size={17} color={!canDelete ? 'rgb(46, 41, 37, 0.4)' : 'rgb(46, 41, 37)'} />
                  <FontText weight="medium" className={!canDelete ? 'opacity-40' : ''}>
                    {canDelete ? 'Delete Section' : 'The only section cannot be deleted'}
                  </FontText>
                </Row>
              </AppButton>
            </View>
          </ConvexDialog.Content>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>
      <DeleteConfirmationDialog
        isOpen={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        onConfirm={() => {
          onDelete();
          onOpenChange(false);
        }}
        itemType="Section"
        itemName={`Section ${sectionNumber}`}
      />
    </>
  );
};

export default NewspaperSectionOptionsDialog;
