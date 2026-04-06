import React from 'react';
import { Pressable } from 'react-native';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import PoppinsText from '../../ui/text/PoppinsText';
import { ThreadViewModel, formatTimestamp } from './townSquareUtils';
import TownSquareAvatar from './TownSquareAvatar';

interface TownSquareThreadListItemProps {
    index: number;
    isLast: boolean;
    onPress: () => void;
    thread: ThreadViewModel;
}

const TownSquareThreadListItem = ({ index, isLast, onPress, thread }: TownSquareThreadListItemProps) => {
    return (
        <Pressable onPress={onPress}>
            <Row className={`items-start gap-4 px-1 py-5 ${!isLast || index === 0 ? 'border-b border-border/20' : ''}`}>
                <TownSquareAvatar uri={thread.authorImageUrl} />
                <Column className='flex-1' gap={2}>
                    <Row className='items-start justify-between gap-3'>
                        <PoppinsText weight={thread.isUnread ? 'bold' : 'medium'} className='flex-1 text-2xl leading-8'>
                            {thread.titleResolved}
                        </PoppinsText>
                        <PoppinsText varient='subtext'>{formatTimestamp(thread.createdAt)}</PoppinsText>
                    </Row>
                    <PoppinsText>{thread.authorDisplayName}</PoppinsText>
                    <PoppinsText varient='subtext'>{thread.previewText || 'Open the thread to read the full post.'}</PoppinsText>
                    <PoppinsText weight='medium' className='text-accent'>
                        {`${thread.replyCount} repl${thread.replyCount === 1 ? 'y' : 'ies'}`}
                    </PoppinsText>
                </Column>
            </Row>
        </Pressable>
    );
};

export default TownSquareThreadListItem;
