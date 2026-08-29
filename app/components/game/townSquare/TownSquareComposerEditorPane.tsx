import React, { useState } from 'react';
import { TextInput, View } from 'react-native';
import Column from '../../layout/Column';
import FontText from '../../ui/text/FontText';
import { SelectionRange } from './townSquareUtils';

interface TownSquareComposerEditorPaneProps {
    onBodyChange: (value: string) => void;
    onSelectionChange: (selection: SelectionRange) => void;
    value: string;
}

const TownSquareComposerEditorPane = ({ onBodyChange, onSelectionChange, value }: TownSquareComposerEditorPaneProps) => {
    const [contentHeight, setContentHeight] = useState(0);
    const lineCount = value.split('\n').length;
    const minHeight = Math.max(120, lineCount * 24 + 32);
    const height = Math.max(minHeight, contentHeight);

    return (
        <Column className='gap-2 flex-1 grow min-w-0'>
            <TextInput
                multiline={true}
                className='min-w-0 min-h-[50vh] rounded-[24px] bg-text/10 overflow-hidden p-4 text-base text-text'
                onChangeText={onBodyChange}
                onContentSizeChange={(event) => setContentHeight(event.nativeEvent.contentSize.height)}
                onSelectionChange={(event) => onSelectionChange(event.nativeEvent.selection)}
                placeholder='Write the thread the way you want it to look.'
                placeholderTextColor='#0004'
                scrollEnabled={false}
                style={{ lineHeight: 24, textAlignVertical: 'top', height }}
                value={value}
            />
        </Column>
    );
};

export default TownSquareComposerEditorPane;
