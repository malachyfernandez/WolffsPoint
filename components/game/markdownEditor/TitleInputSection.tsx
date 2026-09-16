import React from 'react';
import Column from '../../layout/Column';
import FontText from '../../ui/text/FontText';
import FontTextInput from '../../ui/forms/FontTextInput';

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
        <Column className='gap-1'>
            <FontText weight='medium'>{label}</FontText>
            <FontTextInput
                className='w-full rounded-xl border border-subtle-border px-4 py-3'
                placeholder={placeholder}
                value={value}
                onChangeText={onChangeText}
            />
        </Column>
    );
}
export default TitleInputSection;
