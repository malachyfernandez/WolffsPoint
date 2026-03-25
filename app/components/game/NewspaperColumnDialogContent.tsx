import React from 'react';
import { ScrollView } from 'react-native';
import { ScrollShadow } from 'heroui-native';
import { LinearGradient } from 'expo-linear-gradient';
import Column from '../layout/Column';
import Row from '../layout/Row';
import AppButton from '../ui/buttons/AppButton';
import PoppinsText from '../ui/text/PoppinsText';
import PoppinsTextInput from '../ui/forms/PoppinsTextInput';
import DialogHeader from '../ui/dialog/DialogHeader';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';

interface NewspaperColumnDialogContentProps {
    columnIndex: number;
    message: string;
    setMessage: React.Dispatch<React.SetStateAction<string>>;
    onSubmit: () => void;
    onCancel: () => void;
}

const applyWrap = (value: string, prefix: string, suffix = prefix) => {
    if (!value.trim()) {
        return `${prefix}Text${suffix}`;
    }

    return `${value}${value.endsWith('\n') ? '' : '\n'}${prefix}Text${suffix}`;
};

const applyLine = (value: string, prefix: string) => {
    if (!value.trim()) {
        return `${prefix} Heading`;
    }

    return `${value}${value.endsWith('\n') ? '' : '\n'}${prefix} Heading`;
};

const NewspaperColumnDialogContent = ({
    columnIndex,
    message,
    setMessage,
    onSubmit,
    onCancel,
}: NewspaperColumnDialogContentProps) => {
    return (
        <Column>
            <DialogHeader
                text={`Column ${columnIndex + 1}`}
                subtext='Write and preview newspaper markdown'
            />

            <Row className='flex-wrap items-center p-4' gap={2}>
                <AppButton className='w-16 h-8' variant='grey' onPress={() => setMessage((value) => applyLine(value, '#'))}>
                    <PoppinsText color='white' weight='medium'>H1</PoppinsText>
                </AppButton>
                <AppButton className='w-16 h-8' variant='grey' onPress={() => setMessage((value) => applyLine(value, '##'))}>
                    <PoppinsText color='white' weight='medium'>H2</PoppinsText>
                </AppButton>
                <AppButton className='w-20 h-8' variant='grey' onPress={() => setMessage((value) => applyWrap(value, '**'))}>
                    <PoppinsText color='white' weight='medium'>Bold</PoppinsText>
                </AppButton>
                <AppButton className='w-20 h-8' variant='grey' onPress={() => setMessage((value) => applyLine(value, '-'))}>
                    <PoppinsText color='white' weight='medium'>List</PoppinsText>
                </AppButton>
                <AppButton className='w-20 h-8' variant='grey' onPress={() => setMessage((value) => applyLine(value, '>'))}>
                    <PoppinsText color='white' weight='medium'>Quote</PoppinsText>
                </AppButton>
            </Row>

            <ScrollShadow LinearGradientComponent={LinearGradient}>
                <ScrollView className='h-[50vh]'>
                    <Column className='h-full'>
                        <Row className='items-start max-w-full' gap={4}>
                            <Column className='max-w-full shrink flex-1' gap={2}>
                                <PoppinsText weight='medium'>Editor</PoppinsText>
                                <PoppinsTextInput
                                    placeholder='Write newspaper markdown...'
                                    className='w-full min-h-40 border border-subtle-border p-3 bg-inner-background'
                                    value={message}
                                    onChangeText={setMessage}
                                    multiline
                                    autoGrow
                                    scrollEnabled={false}
                                    style={{ minHeight: 44, textAlignVertical: 'top' }}
                                />
                            </Column>

                            <Column className='max-w-full shrink flex-1 ' gap={2}>
                                <PoppinsText weight='medium'>Preview</PoppinsText>
                                <Column className='flex-1 w-full rounded-xl border border-border bg-background p-3' gap={2}>
                                    <MarkdownRenderer markdown={message} textAlign='justify' />
                                </Column>
                            </Column>


                        </Row>
                    </Column>
                </ScrollView>
            </ScrollShadow>
            <Row gap={2}>
                <AppButton className='w-34 h-10' variant='black' onPress={onSubmit}>
                    <PoppinsText color='white' weight='medium'>Save</PoppinsText>
                </AppButton>
                <AppButton className='w-34 h-10' variant='outline-alt' onPress={onCancel}>
                    <PoppinsText color='black' weight='medium'>Cancel</PoppinsText>
                </AppButton>
            </Row>
        </Column>
    );
};

export default NewspaperColumnDialogContent;
