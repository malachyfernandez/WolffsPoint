import React from 'react';
import Row from '../../layout/Row';
import AppButton from '../../ui/buttons/AppButton';
import DisableableButton from '../../ui/buttons/DisableableButton';
import FontText from '../../ui/text/FontText';

interface ActionButtonsProps {
    canSubmit: boolean;
    submitLabel: string;
    submitDisabledText?: string;
    onCancel: () => void;
    onSubmit: () => void;
}

export function ActionButtons({
    canSubmit,
    submitLabel,
    submitDisabledText = 'No Changes',
    onCancel,
    onSubmit,
}: ActionButtonsProps) {
    return (
        <Row className='gap-4 justify-end pt-1'>
            <AppButton variant='outline' className='w-20 sm:w-32' onPress={onCancel}>
                <FontText weight='medium'>Cancel</FontText>
            </AppButton>
            <DisableableButton
                isEnabled={canSubmit}
                enabledText={submitLabel}
                disabledText={submitDisabledText}
                enabledVariant='filled'
                className='w-32'
                onPress={onSubmit}
            />
        </Row>
    );
}
export default ActionButtons;
