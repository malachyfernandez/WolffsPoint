import React, { RefObject } from 'react';
import { ScrollView } from 'react-native';
import { ScrollShadow } from 'heroui-native';
import { LinearGradient } from 'expo-linear-gradient';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import AppButton from '../../ui/buttons/AppButton';
import PoppinsText from '../../ui/text/PoppinsText';
import { ThreadViewModel } from './townSquareUtils';
import TownSquareThreadListItem from './TownSquareThreadListItem';

interface TownSquareThreadListViewProps {
    listScrollRef: RefObject<ScrollView | null>;
    onNewThread: () => void;
    onOpenThread: (thread: ThreadViewModel) => void;
    onScrollYChange: (scrollY: number) => void;
    threads: ThreadViewModel[];
}

const TownSquareThreadListView = ({
    listScrollRef,
    onNewThread,
    onOpenThread,
    onScrollYChange,
    threads,
}: TownSquareThreadListViewProps) => {
    return (
        <Column className='flex-1 px-4 py-4' gap={5}>
            <Row className='items-start justify-between gap-4'>
                <Column gap={1}>
                    <PoppinsText weight='bold' className='text-3xl leading-10'>Town Square</PoppinsText>
                </Column>
                <AppButton variant='green' className='w-36' onPress={onNewThread}>
                    <PoppinsText weight='medium' color='white'>New thread</PoppinsText>
                </AppButton>
            </Row>

            <Column className='flex-1' gap={3}>
                <Row className='items-center justify-between border-b border-border/20 pb-3'>
                    <PoppinsText weight='medium'>Discussion index</PoppinsText>
                    <PoppinsText varient='subtext'>{`${threads.length} thread${threads.length === 1 ? '' : 's'}`}</PoppinsText>
                </Row>

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
            </Column>
        </Column>
    );
};

export default TownSquareThreadListView;
