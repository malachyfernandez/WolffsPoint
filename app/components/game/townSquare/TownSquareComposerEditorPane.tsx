import React from 'react';
import { TextInput } from 'react-native';
import Column from '../../layout/Column';
import PoppinsText from '../../ui/text/PoppinsText';
import { SelectionRange } from './townSquareUtils';

interface TownSquareComposerEditorPaneProps {
    onBodyChange: (value: string) => void;
    onSelectionChange: (selection: SelectionRange) => void;
    value: string;
}

const TownSquareComposerEditorPane = ({ onBodyChange, onSelectionChange, value }: TownSquareComposerEditorPaneProps) => {
    return (
        <Column className='min-w-0' gap={2}>
            {/* <PoppinsText weight='medium'>Body</PoppinsText> */}
            <TextInput
                multiline={true}
                className='min-h-[50vh] min-w-0 rounded-[24px] bg-text/10 overflow-hidden p-4 text-base text-text'
                onChangeText={onBodyChange}
                onSelectionChange={(event) => onSelectionChange(event.nativeEvent.selection)}
                placeholder='Write the thread the way you want it to look.'
                placeholderTextColor='#0004'
                scrollEnabled={false}
                style={{ lineHeight: 24, textAlignVertical: 'top', height: Math.max(120, value.split('\n').length * 24 + 32) }}
                value={value}
            />
        </Column>
    );
};

export default TownSquareComposerEditorPane;
