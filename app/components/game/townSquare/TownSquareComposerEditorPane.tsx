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
        <Column className='flex-1 min-w-0' gap={2}>
            <PoppinsText weight='medium'>Body</PoppinsText>
            <TextInput
                multiline={true}
                className='h-[52vh] w-full rounded-[24px] border border-subtle-border px-4 py-4 text-base text-text'
                onChangeText={onBodyChange}
                onSelectionChange={(event) => onSelectionChange(event.nativeEvent.selection)}
                placeholder='Write the thread the way you want it to look.'
                scrollEnabled={true}
                style={{ lineHeight: 24, textAlignVertical: 'top' }}
                value={value}
            />
        </Column>
    );
};

export default TownSquareComposerEditorPane;
