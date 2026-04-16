import React from 'react';
import Column from '../../layout/Column';
import PoppinsText from '../../ui/text/PoppinsText';
import PoppinsTextInput from '../../ui/forms/PoppinsTextInput';

interface TitleInputSectionProps {
    label: string;
    placeholder: string;
    value: string;
    onChangeText: (text: string) => void;
}

export function TitleInputSection({
    label,
    placeholder,
    value,
    onChangeText,
}: TitleInputSectionProps) {
    return (
        <Column gap={1}>
            <PoppinsText weight='medium'>{label}</PoppinsText>
            <PoppinsTextInput
                className='w-full rounded-xl border border-subtle-border px-4 py-3'
                placeholder={placeholder}
                value={value}
                onChangeText={onChangeText}
            />
        </Column>
    );
}
