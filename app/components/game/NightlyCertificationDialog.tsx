import React from 'react';
import { ScrollView, View } from 'react-native';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import DialogHeader from '../ui/dialog/DialogHeader';
import Column from '../layout/Column';
import Row from '../layout/Row';
import FontText from '../ui/text/FontText';
import AppButton from '../ui/buttons/AppButton';
import { PlayerNightSubmission } from '../../../types/multiplayer';
import { UserTableItem } from '../../../types/playerTable';
import { getPlayerActionSummary } from '../../../utils/multiplayer';

interface NightlyCertificationDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    users: UserTableItem[];
    submissionsByEmail: Record<string, PlayerNightSubmission>;
    onCertify: () => void;
}

const NightlyCertificationDialog = ({ isOpen, onOpenChange, users, submissionsByEmail, onCertify }: NightlyCertificationDialogProps) => {
    return (
        <ConvexDialog.Root isOpen={isOpen} onOpenChange={onOpenChange}>
            <ConvexDialog.Trigger asChild>
                <View />
            </ConvexDialog.Trigger>
            <ConvexDialog.Portal>
                <ConvexDialog.Overlay />
                <ConvexDialog.Content className='p-1 h-[85vh] max-w-5xl'>
                    <ConvexDialog.Close iconProps={{ color: 'rgb(246, 238, 219)' }} className="w-10 h-10 bg-accent-hover absolute right-4 top-4 z-10" />
                    <DialogHeader text='Nightly submissions' subtext='Review what each player submitted before you certify it into the operator table.' />
                    <ScrollView className='p-4'>
                        <Column className='gap-2'>
                            <Row className='gap-4 border-b border-subtle-border pb-2'>
                                <FontText weight='medium' className='flex-1'>Player</FontText>
                                <FontText weight='medium' className='flex-1'>Vote</FontText>
                                <FontText weight='medium' className='flex-1'>Action</FontText>
                            </Row>
                            {users.map((user) => {
                                const submission = submissionsByEmail[user.email];
                                return (
                                    <Row key={user.email} className='gap-4 border-b border-subtle-border py-2'>
                                        <FontText className='flex-1'>{user.realName || user.email}</FontText>
                                        <FontText className='flex-1'>{submission?.vote || '—'}</FontText>
                                        <FontText className='flex-1'>{getPlayerActionSummary(submission?.action) || '—'}</FontText>
                                    </Row>
                                );
                            })}
                        </Column>
                    </ScrollView>
                    <Row className='gap-4 justify-end px-4 pb-4'>
                        <AppButton variant='outline' className='w-32' onPress={() => onOpenChange(false)}>
                            <FontText weight='medium'>Close</FontText>
                        </AppButton>
                        <AppButton
                            variant='black'
                            className='w-40'
                            onPress={() => {
                                onCertify();
                                onOpenChange(false);
                            }}
                        >
                            <FontText weight='medium' color='white'>Certify Results</FontText>
                        </AppButton>
                    </Row>
                </ConvexDialog.Content>
            </ConvexDialog.Portal>
        </ConvexDialog.Root>
    );
};

export default NightlyCertificationDialog;
