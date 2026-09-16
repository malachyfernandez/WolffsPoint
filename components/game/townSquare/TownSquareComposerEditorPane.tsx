import React, { useState } from 'react';
import { Platform, TextInput } from 'react-native';
import Column from '../../layout/Column';
import FontTextInput from '../../ui/forms/FontTextInput';
import { SelectionRange } from './townSquareUtils';
import { useToast } from '../../../../contexts/ToastContext';

interface TownSquareComposerEditorPaneProps {
    onBodyChange: (value: string) => void;
    onSelectionChange: (selection: SelectionRange) => void;
    value: string;
    /** When true, the editor is non-editable (view-only). */
    readOnly?: boolean;
}

const TownSquareComposerEditorPane = ({ onBodyChange, onSelectionChange, value, readOnly = false }: TownSquareComposerEditorPaneProps) => {
    const [contentHeight, setContentHeight] = useState(0);
    const { showToast } = useToast();
    const lineCount = value.split('\n').length;
    const minHeight = Math.max(120, lineCount * 24 + 32);
    const height = Math.max(minHeight, contentHeight);

    // When read-only, show a "Preview only" toast whenever the user attempts to
    // type into the editor. The native HTML `readOnly` attribute prevents the
    // text from actually changing; this handler just surfaces the feedback.
    const handleReadOnlyKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (event) => {
        // Ignore modifier-only and navigation keys — only toast on printable input.
        if (event.metaKey || event.ctrlKey || event.altKey) return;
        if (event.key.length === 1 || event.key === 'Enter' || event.key === 'Backspace' || event.key === 'Delete' || event.key === 'Tab') {
            showToast('Preview only');
        }
    };

    if (Platform.OS === 'web') {
        return (
            <Column className='gap-2 flex-1 grow min-w-0'>
                <FontTextInput
                    autoGrow
                    multiline
                    className='min-w-0 rounded-3xl bg-text/10 p-4 text-base text-text'
                    onChangeText={readOnly ? undefined : onBodyChange}
                    onSelectionChange={(event) => onSelectionChange(event.nativeEvent.selection)}
                    onKeyDown={readOnly ? handleReadOnlyKeyDown : undefined}
                    placeholder='Write the thread the way you want it to look.'
                    style={{ lineHeight: '24px', minHeight: '50vh' } as any}
                    value={value}
                    editable={!readOnly}
                />
            </Column>
        );
    }

    return (
        <Column className='gap-2 flex-1 grow min-w-0'>
            <TextInput
                multiline={true}
                className='min-w-0 min-h-[50vh] rounded-3xl bg-text/10 overflow-hidden p-4 text-base text-text'
                onChangeText={readOnly ? undefined : onBodyChange}
                onKeyPress={readOnly ? () => showToast('Preview only') : undefined}
                onContentSizeChange={(event) => setContentHeight(event.nativeEvent.contentSize.height)}
                onSelectionChange={(event) => onSelectionChange(event.nativeEvent.selection)}
                placeholder='Write the thread the way you want it to look.'
                placeholderTextColor='#0004'
                scrollEnabled={false}
                style={{ lineHeight: 24, textAlignVertical: 'top', height }}
                value={value}
                editable={!readOnly}
            />
        </Column>
    );
};

export default TownSquareComposerEditorPane;
