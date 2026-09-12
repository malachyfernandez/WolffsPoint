import React from 'react';
import { Pressable, View } from 'react-native';
import { CheckSquare, Square, Pencil } from 'lucide-react-native';
import FontText from '../../ui/text/FontText';
import { useMultiSelect } from './MultiSelectContext';

/**
 * Toolbar with Select/Cancel and Edit buttons.
 * - "Select" enters selection mode; becomes "Cancel" in selection mode.
 * - "Edit" appears when ≥1 cell is selected; triggers all registered bulk-edit handlers.
 *
 * Uses `triggerEdit` from the MultiSelectContext, so this toolbar can be
 * rendered anywhere inside the provider and will dispatch to whichever
 * table(s) have registered handlers matching the locked cell type.
 */
const MultiSelectToolbar = () => {
  const { selectionMode, setSelectionMode, selectedCells, exitSelectionMode, triggerEdit } =
    useMultiSelect();
  const count = selectedCells.size;

  if (!selectionMode) {
    return (
      <View className="z-50 -mb-12 flex-row items-center gap-2">
        <Pressable
          onPress={() => setSelectionMode(true)}
          className="flex-row items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5">
          <Square size={14} color="rgb(46, 41, 37)" />
          <FontText weight="medium" className="text-sm">
            Select
          </FontText>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="z-50 -mb-12 flex-row items-center gap-2">
      <Pressable
        onPress={exitSelectionMode}
        className="flex-row items-center gap-1.5 rounded-lg border border-border bg-text px-3 py-1.5">
        <CheckSquare size={14} color="white" />
        <FontText weight="medium" color="white" className="text-sm">
          Cancel
        </FontText>
      </Pressable>
      {count > 0 && (
        <>
          <FontText weight="medium" className="text-sm opacity-70">
            {count} selected
          </FontText>
          <Pressable
            onPress={triggerEdit}
            className="flex-row items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5">
            <Pencil size={14} color="rgb(46, 41, 37)" />
            <FontText weight="medium" className="text-sm">
              Edit
            </FontText>
          </Pressable>
        </>
      )}
    </View>
  );
};

export default MultiSelectToolbar;
