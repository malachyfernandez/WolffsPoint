import React from 'react';
import { Pressable, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import PoppinsText from '../../ui/text/PoppinsText';
import { TownSquareAuthorAvatar, TownSquareAuthorName } from './TownSquareAuthorIdentity';
import { ThreadViewModel, TownSquareReadState, formatTimestamp } from './townSquareUtils';

interface TownSquareThreadListItemProps {
    index: number;
    isLast: boolean;
    onPress: () => void;
    readStateSnapshot: TownSquareReadState;
    thread: ThreadViewModel;
}

const TownSquareThreadListItem = ({ index, isLast, onPress, readStateSnapshot, thread }: TownSquareThreadListItemProps) => {
    const threadReadState = readStateSnapshot[thread.postId];
    const isNeverViewed = !threadReadState;
    // Only show new replies for threads that were previously viewed (not brand new threads)
    const newReplyCount = threadReadState ? Math.max(0, thread.replyCount - threadReadState.replyCount) : 0;
    const hasNewReplies = !isNeverViewed && newReplyCount > 0;
    return (
        <Pressable onPress={onPress}>
            <Row className={`items-start gap-4 px-1 py-5 ${!isLast || index === 0 ? 'border-b border-border/20' : ''}`}>
                <TownSquareAuthorAvatar gameId={thread.gameId} userId={thread.authorUserId} />
                <Column className='flex-1'>
                    <Column gap={0}>
                        <Row className='items-start justify-between gap-3'>
                            <Row className='flex-1 items-center gap-2'>
                                <PoppinsText weight={isNeverViewed ? 'bold' : 'medium'} className='text-xl leading-8'>
                                    {thread.titleResolved}
                                </PoppinsText>
                                {isNeverViewed && (
                                    <View className='px-1.5 py-0.5 bg-red-500 rounded-full'>
                                        <PoppinsText weight='medium' className='text-xs text-white'>New</PoppinsText>
                                    </View>
                                )}
                            </Row>
                            <PoppinsText varient='subtext'>{formatTimestamp(thread.createdAt)}</PoppinsText>
                        </Row>
                        <TownSquareAuthorName gameId={thread.gameId} userId={thread.authorUserId} varient='subtext' />
                    </Column>
                    <Column  gap={2}>
                        <PoppinsText weight='medium'>{thread.previewText || 'Open the thread to read the full post.'}</PoppinsText>

                        <Row className='items-center gap-2'>
                            {thread.postType === 'announcement' ? (
                                <PoppinsText varient='subtext' className='bg-text/10 px-3 py-1 rounded-full'>
                                    Announcement
                                </PoppinsText>
                            ) : (
                                <>
                                    <PoppinsText varient='subtext' className='text-accent'>
                                        {`${thread.replyCount} repl${thread.replyCount === 1 ? 'y' : 'ies'}`}
                                    </PoppinsText>
                                    {hasNewReplies && (
                                        <View className='px-1.5 py-0.5 bg-accent rounded-full'>
                                            <PoppinsText weight='medium' className='text-xs text-white'>
                                                {`${newReplyCount} New`}
                                            </PoppinsText>
                                        </View>
                                    )}
                                </>
                            )}
                        </Row>
                    </Column>
                </Column>
                <ChevronRight size={20} color="#666" className="mt-8" />
            </Row>
        </Pressable>
    );
};

export default TownSquareThreadListItem;
