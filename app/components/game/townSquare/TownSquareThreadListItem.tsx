import React from 'react';
import { Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import PoppinsText from '../../ui/text/PoppinsText';
import { TownSquareAuthorAvatar, TownSquareAuthorName } from './TownSquareAuthorIdentity';
import { ThreadViewModel, formatTimestamp } from './townSquareUtils';

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
                <TownSquareAuthorAvatar gameId={thread.gameId} userId={thread.authorUserId} />
                <Column className='flex-1' gap={2}>
                    <Row className='items-start justify-between gap-3'>
                        <PoppinsText weight={thread.isUnread ? 'bold' : 'medium'} className='flex-1 text-2xl leading-8'>
                            {thread.titleResolved}
                        </PoppinsText>
                        <PoppinsText varient='subtext'>{formatTimestamp(thread.createdAt)}</PoppinsText>
                    </Row>
                    <TownSquareAuthorName gameId={thread.gameId} userId={thread.authorUserId} />
                    <PoppinsText varient='subtext'>{thread.previewText || 'Open the thread to read the full post.'}</PoppinsText>
                    <PoppinsText weight='medium' className='text-accent'>
                        {`${thread.replyCount} repl${thread.replyCount === 1 ? 'y' : 'ies'}`}
                    </PoppinsText>
                </Column>
                <ChevronRight size={20} color="#666" className="mt-8" />
            </Row>
        </Pressable>
    );
};

export default TownSquareThreadListItem;
