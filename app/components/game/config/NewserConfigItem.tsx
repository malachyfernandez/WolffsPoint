import React, { useEffect, useMemo, useState } from 'react';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import ConfigSectionRow from '../../ui/forms/ConfigSectionRow';
import FontText from '../../ui/text/FontText';
import FontTextInput from '../../ui/forms/FontTextInput';
import AppButton from '../../ui/buttons/AppButton';
import { useUserVariable } from '../../../../hooks/useUserVariable';
import { useUserVariableGet } from '../../../../hooks/useUserVariableGet';
import { NewserAssignment, PublicUserData, getNewserAssignmentKey, resolveJoinedUserByEmail } from '../../../../utils/newspaperControl';

interface NewserConfigItemProps {
    gameId: string;
}

const normalizeEmail = (value: string) => {
    return value.trim().toLowerCase();
};

const isValidEmail = (value: string) => {
    return /.+@.+\..+/.test(value);
};

const emptyAssignment: NewserAssignment = {
    email: '',
    userId: '',
    assignedAt: 0,
};

const NewserConfigItem = ({ gameId }: NewserConfigItemProps) => {
    const [assignment, setAssignment] = useUserVariable<NewserAssignment>({
        key: getNewserAssignmentKey(gameId),
        defaultValue: emptyAssignment,
        privacy: 'PUBLIC',
    });
    const userDataRecords = useUserVariableGet<PublicUserData>({
        key: 'userData',
        returnTop: 500,
    });
    const [draftEmail, setDraftEmail] = useState(assignment.value.email ?? '');

    useEffect(() => {
        setDraftEmail(assignment.value.email ?? '');
    }, [assignment.value.email]);

    const normalizedDraftEmail = normalizeEmail(draftEmail);
    const matchingJoinedUser = useMemo(() => {
        return resolveJoinedUserByEmail({
            email: normalizedDraftEmail,
            userDatas: userDataRecords?.map((record) => record.value) ?? [],
        });
    }, [normalizedDraftEmail, userDataRecords]);
    const hasUnsavedChanges = normalizedDraftEmail !== normalizeEmail(assignment.value.email ?? '');

    const statusText = useMemo(() => {
        if (!normalizedDraftEmail) {
            if (assignment.value.email.trim()) {
                return `Current Newser: ${assignment.value.email}`;
            }

            return 'No Newser assigned yet.';
        }

        if (!isValidEmail(normalizedDraftEmail)) {
            return 'Enter a valid email address for the Newser account.';
        }

        if (userDataRecords === undefined) {
            return 'Checking whether that account has joined yet…';
        }

        if (!matchingJoinedUser) {
            return 'That email can be assigned now. Once someone joins with it, they will get the Newser tabs.';
        }

        return `${matchingJoinedUser.email} has joined and is ready to access the Newser tabs.`;
    }, [assignment.value.email, matchingJoinedUser, normalizedDraftEmail, userDataRecords]);

    const saveAssignment = () => {
        if (!isValidEmail(normalizedDraftEmail)) {
            return;
        }

        setAssignment({
            email: normalizedDraftEmail,
            userId: matchingJoinedUser?.userId ?? '',
            assignedAt: Date.now(),
        });
    };

    const clearAssignment = () => {
        setAssignment(emptyAssignment);
    };

    return (
        <ConfigSectionRow
            title='Newser'
            subtext='Assign the separate email account that owns the newspaper by default. The Newser is not part of the player list, and the operator can still take control day-by-day from the newspaper page.'
        >
            <Column className='gap-3 min-w-[280px] max-w-[360px] flex-1'>
                <FontTextInput
                    autoCapitalize='none'
                    autoCorrect={false}
                    keyboardType='email-address'
                    onChangeText={setDraftEmail}
                    placeholder='newser@email.com'
                    value={draftEmail}
                    variant='styled'
                    className='w-full rounded-xl px-3 py-3'
                />
                <FontText variant='subtext'>{statusText}</FontText>
                <Row className='gap-3 items-center'>
                    <AppButton
                        variant='filled'
                        className='min-w-[150px]'
                        disabled={!hasUnsavedChanges || !isValidEmail(normalizedDraftEmail)}
                        onPress={saveAssignment}
                    >
                        <FontText weight='medium' color='white'>Save Newser</FontText>
                    </AppButton>
                    <AppButton
                        variant='outline'
                        className='min-w-[120px]'
                        disabled={!assignment.value.email.trim()}
                        onPress={clearAssignment}
                    >
                        <FontText weight='medium'>Clear</FontText>
                    </AppButton>
                </Row>
            </Column>
        </ConfigSectionRow>
    );
};

export default NewserConfigItem;
