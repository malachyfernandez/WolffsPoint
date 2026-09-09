import React from 'react';
import { View } from 'react-native';
import ConvexDialog from '../../ui/dialog/ConvexDialog';
import DialogHeader from '../../ui/dialog/DialogHeader';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import AppButton from '../../ui/buttons/AppButton';
import FontText from '../../ui/text/FontText';
import { Usepaper } from '../../../../types/usepaper';
import NewspaperZoomableView from './NewspaperZoomableView';

interface ImportDraftDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    /** The draft to preview (already loaded). */
    draft: Usepaper | null;
    /** Whether the draft is still loading. */
    isLoading: boolean;
    /** Display label for whose draft this is (e.g. "Newser" or "Operator"). */
    sourceLabel: string;
    /** Game ID for markdown rendering context. */
    realGameId: string;
    onConfirmImport: () => void;
}

const TILE_SIZE = 600;

const ImportDraftDialog = ({
    isOpen,
    onOpenChange,
    draft,
    isLoading,
    sourceLabel,
    realGameId,
    onConfirmImport,
}: ImportDraftDialogProps) => {
    const columns = draft?.columns ?? [];
    const hasContent = columns.some((c) => c.trim().length > 0);

    return (
        <ConvexDialog.Root isOpen={isOpen} onOpenChange={onOpenChange}>
            <ConvexDialog.Portal>
                <ConvexDialog.Overlay />
                <ConvexDialog.Content className='h-[90vh]'>
                    <ConvexDialog.Close
                        iconProps={{ color: 'rgb(246, 238, 219)' }}
                        className='bg-text-inverted/10 hover:bg-text-inverted/15 absolute right-0 top-0 z-10 h-10 w-10 rounded-full'
                    />
                    <DialogHeader
                        text={`Import ${sourceLabel} Draft`}
                        subtext='Preview the draft below before replacing your newspaper'
                    />

                    <Column className='min-h-0 flex-1 gap-3 pt-3'>
                        {isLoading ? (
                            <View className='border-subtle-border bg-text/5 rounded-lg border p-8'>
                                <FontText variant='subtext' className='text-center'>
                                    Loading draft…
                                </FontText>
                            </View>
                        ) : !hasContent ? (
                            <View className='border-subtle-border bg-text/5 rounded-lg border p-8'>
                                <FontText variant='subtext' className='text-center'>
                                    The {sourceLabel.toLowerCase()} draft is blank.
                                </FontText>
                            </View>
                        ) : (
                            <View className='flex-1'>
                                <NewspaperZoomableView
                                    columns={columns}
                                    gameId={realGameId}
                                    TILE_SIZE={TILE_SIZE}
                                    roundBottom
                                />
                            </View>
                        )}

                        <Row className='justify-end gap-4 pt-2'>
                            <AppButton variant='outline' className='w-28' onPress={() => onOpenChange(false)}>
                                <FontText weight='medium'>Cancel</FontText>
                            </AppButton>
                            <AppButton
                                variant='filled'
                                className='w-full sm:w-auto sm:min-w-[260px]'
                                disabled={isLoading || !hasContent}
                                onPress={() => {
                                    onConfirmImport();
                                    onOpenChange(false);
                                }}
                            >
                                <FontText weight='medium' color='white'>
                                    {`Replace Newspaper With ${sourceLabel} Draft`}
                                </FontText>
                            </AppButton>
                        </Row>
                    </Column>
                </ConvexDialog.Content>
            </ConvexDialog.Portal>
        </ConvexDialog.Root>
    );
};

export default ImportDraftDialog;
