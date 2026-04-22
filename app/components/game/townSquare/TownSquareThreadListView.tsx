import React, { RefObject, useMemo } from 'react';
import { ScrollView, useWindowDimensions } from 'react-native';
import ShadowScrollView from '../../ui/ShadowScrollView';
import { Plus } from 'lucide-react-native';
import StateAnimatedView from '../../ui/StateAnimatedView';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import AppButton from '../../ui/buttons/AppButton';
import FontText from '../../ui/text/FontText';
import LoadingText from '../../ui/loading/LoadingText';
import { ThreadViewModel, TownSquareReadState } from './townSquareUtils';
import TownSquareThreadListItem from './TownSquareThreadListItem';

interface TownSquareThreadListViewProps {
    isLoading: boolean;
    isPlayerDead: boolean;
    listScrollRef: RefObject<ScrollView | null>;
    onNewAnnouncement: () => void;
    onNewThread: () => void;
    onOpenThread: (thread: ThreadViewModel) => void;
    onScrollYChange: (scrollY: number) => void;
    readStateSnapshot: TownSquareReadState;
    threads: ThreadViewModel[];
}

const fadeIn = { opacity: [0, 1] as [number, number], duration: 300 };

const TownSquareThreadListView = ({
    isLoading,
    isPlayerDead,
    listScrollRef,
    onNewAnnouncement,
    onNewThread,
    onOpenThread,
    onScrollYChange,
    readStateSnapshot,
    threads,
}: TownSquareThreadListViewProps) => {
    const hasLoaded = useMemo(() => !isLoading, [isLoading]);
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 400;

    return (
        <Column className='gap-5 flex-1 px-0 sm:px-4 py-4'>
            <Row className='gap-4 items-start justify-between'>
                <Column className='gap-0 flex grow'>
                    <FontText weight='bold' className='text-2xl leading-10'>Town Square</FontText>
                    <FontText variant='subtext'>Anyone can speak their mind</FontText>
                </Column>

                {!isPlayerDead && (isLargeScreen ? (
                    // IF screen is 500 or larger, show this
                    <Row className='gap-4 justify-between sm:justify-end flex-1 items-center'>
                        <AppButton variant='secondary' className='px-0' onPress={onNewAnnouncement}>
                            <Row className='gap-3 items-center'>
                                <Plus size={20} color='black' />
                                <Column className='gap-0 items-start'>
                                    <FontText weight='medium' className='-mb-1'>Announcement</FontText>
                                    <FontText variant='subtext'>Just You; No Replies</FontText>
                                </Column>
                            </Row>
                        </AppButton>
                        <AppButton variant='accent' className='px-0' onPress={onNewThread}>
                            <Row className='gap-2 items-center'>
                                <Plus size={20} color='white' />
                                <FontText weight='medium' color='white'>Thread</FontText>
                            </Row>
                        </AppButton>
                    </Row>
                ) : (
                    // IF screen is 500 or smaller, show this
                    <Column className='gap-0 justify-between sm:justify-end flex-1 items-center'>
                        <AppButton variant='accent' className='px-0 w-full' onPress={onNewThread}>
                            <Row className='gap-2 items-center'>
                                <Plus size={20} color='white' />
                                <FontText weight='medium' color='white'>Thread</FontText>
                            </Row>
                        </AppButton>

                        <AppButton variant='secondary' className='px-0 w-full' onPress={onNewAnnouncement}>
                            <Row className='gap-3 items-center'>
                                <Plus size={20} color='black' />
                                <Column className='gap-0 items-start'>
                                    <FontText weight='medium' className='-mb-1'>Announcement</FontText>
                                    <FontText variant='subtext'>Just You; No Replies</FontText>
                                </Column>
                            </Row>
                        </AppButton>
                    </Column>
                ))}
            </Row>

            <Column className='gap-3 flex-1'>
                <Row className='gap-4 items-center justify-between border-b border-border/20 pb-3'>
                    <FontText variant='subtext'>{`${threads.length} thread${threads.length === 1 ? '' : 's'}`}</FontText>
                </Row>

                <StateAnimatedView.Container stateVar={hasLoaded} className='flex-1'>
                    <StateAnimatedView.Option stateValue={false}>
                        <ShadowScrollView
                            className='flex-1'
                            scrollViewClassName='flex-1'
                            ref={listScrollRef}
                            onScroll={(event: any) => onScrollYChange(event.nativeEvent.contentOffset.y)}
                            scrollEventThrottle={16}
                        >
                            <Column className='gap-1 items-center justify-center py-24'>
                                <LoadingText text='Loading threads' />
                            </Column>
                        </ShadowScrollView>
                    </StateAnimatedView.Option>

                    <StateAnimatedView.Option stateValue={true} onValue={fadeIn}>
                        <ShadowScrollView
                            className='flex-1'
                            scrollViewClassName='flex-1'
                            ref={listScrollRef}
                            onScroll={(event: any) => onScrollYChange(event.nativeEvent.contentOffset.y)}
                            scrollEventThrottle={16}
                        >
                            {threads.length > 0 ? (
                                <Column className='gap-0'>
                                    {threads.map((thread, index) => (
                                        <TownSquareThreadListItem
                                            key={thread.postId}
                                            index={index}
                                            isLast={index === threads.length - 1}
                                            onPress={() => onOpenThread(thread)}
                                            readStateSnapshot={readStateSnapshot}
                                            thread={thread}
                                        />
                                    ))}
                                </Column>
                            ) : (
                                <Column className='gap-1 items-center justify-center py-24'>
                                    <FontText weight='medium'>No threads yet</FontText>
                                    <FontText variant='subtext'>Kick things off with the first post.</FontText>
                                </Column>
                            )}
                        </ShadowScrollView>
                    </StateAnimatedView.Option>
                </StateAnimatedView.Container>
            </Column>
        </Column>
    );
};

export default TownSquareThreadListView;
