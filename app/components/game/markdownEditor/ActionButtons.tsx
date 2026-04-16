import React from 'react';
import Row from '../../layout/Row';
import AppButton from '../../ui/buttons/AppButton';
import DisableableButton from '../../ui/buttons/DisableableButton';
import PoppinsText from '../../ui/text/PoppinsText';

interface ActionButtonsProps {
    canSubmit: boolean;
    submitLabel: string;
    onCancel: () => void;
    onSubmit: () => void;
}

export function ActionButtons({
    canSubmit,
    submitLabel,
    onCancel,
    onSubmit,
}: ActionButtonsProps) {
    return (
        <Row className='justify-end gap-3 pt-1'>
            <AppButton variant='outline' className='w-32' onPress={onCancel}>
                <PoppinsText weight='medium'>Cancel</PoppinsText>
            </AppButton>
            <DisableableButton
                isEnabled={canSubmit}
                enabledText={submitLabel}
                disabledText='No Changes'
                enabledVariant='filled'
                className='w-40'
                onPress={onSubmit}
            />
        </Row>
    );
}
