import React, { RefObject, useMemo } from 'react';
import { ScrollView } from 'react-native';
import { ScrollShadow } from 'heroui-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus } from 'lucide-react-native';
import StateAnimatedView from '../../ui/StateAnimatedView';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import AppButton from '../../ui/buttons/AppButton';
import PoppinsText from '../../ui/text/PoppinsText';
import LoadingText from '../../ui/loading/LoadingText';
import { ThreadViewModel, TownSquareReadState } from './townSquareUtils';
import TownSquareThreadListItem from './TownSquareThreadListItem';

interface TownSquareThreadListViewProps {
    isLoading: boolean;
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
    listScrollRef,
    onNewAnnouncement,
    onNewThread,
    onOpenThread,
    onScrollYChange,
    readStateSnapshot,
    threads,
}: TownSquareThreadListViewProps) => {
    const hasLoaded = useMemo(() => !isLoading, [isLoading]);

    return (
        <Column className='flex-1 px-4 py-4' gap={5}>
            <Row className='items-start justify-between gap-4'>
                <Column gap={0} className='hidden sm:flex grow'>
                    <PoppinsText weight='bold' className='text-2xl leading-10'>Town Square</PoppinsText>
                    <PoppinsText varient='subtext'>Anyone can speak their mind</PoppinsText>
                </Column>
                <Row className='justify-between sm:justify-end flex-1 items-center gap-2'>
                    <AppButton variant='secondary' className='px-0' onPress={onNewAnnouncement}>
                        <Row className='items-center gap-2' gap={3}>
                            <Plus size={20} color='black' />
                            <Column className='items-start' gap={0}>
                                <PoppinsText weight='medium' className='-mb-1'>Announcement</PoppinsText>
                                <PoppinsText varient='subtext'>Just You; No Replies</PoppinsText>
                            </Column>
                        </Row>
                    </AppButton>
                    <AppButton variant='accent' className='px-0' onPress={onNewThread}>
                        <Row className='items-center gap-2' gap={2}>
                            <Plus size={20} color='white' />
                            <PoppinsText weight='medium' color='white'>Thread</PoppinsText>
                        </Row>
                    </AppButton>
                </Row>
            </Row>

            <Column className='flex-1' gap={3}>
                <Row className='items-center justify-between border-b border-border/20 pb-3'>
                    <PoppinsText varient='subtext'>{`${threads.length} thread${threads.length === 1 ? '' : 's'}`}</PoppinsText>
                </Row>

                <StateAnimatedView.Container stateVar={hasLoaded} className='flex-1'>
                    <StateAnimatedView.Option stateValue={false}>
                        <ScrollShadow LinearGradientComponent={LinearGradient} className='flex-1'>
                            <ScrollView
                                ref={listScrollRef}
                                className='flex-1'
                                onScroll={(event) => onScrollYChange(event.nativeEvent.contentOffset.y)}
                                scrollEventThrottle={16}
                            >
                                <Column className='items-center justify-center py-24' gap={1}>
                                    <LoadingText text='Loading threads' />
                                </Column>
                            </ScrollView>
                        </ScrollShadow>
                    </StateAnimatedView.Option>

                    <StateAnimatedView.Option stateValue={true} onValue={fadeIn}>
                        <ScrollShadow LinearGradientComponent={LinearGradient} className='flex-1'>
                            <ScrollView
                                ref={listScrollRef}
                                className='flex-1'
                                onScroll={(event) => onScrollYChange(event.nativeEvent.contentOffset.y)}
                                scrollEventThrottle={16}
                            >
                                {threads.length > 0 ? (
                                    <Column gap={0}>
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
                                    <Column className='items-center justify-center py-24' gap={1}>
                                        <PoppinsText weight='medium'>No threads yet</PoppinsText>
                                        <PoppinsText varient='subtext'>Kick things off with the first post.</PoppinsText>
                                    </Column>
                                )}
                            </ScrollView>
                        </ScrollShadow>
                    </StateAnimatedView.Option>
                </StateAnimatedView.Container>
            </Column>
        </Column>
    );
};

export default TownSquareThreadListView;
