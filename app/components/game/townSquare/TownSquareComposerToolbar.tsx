import React from 'react';
import { Bold, ChevronDown, ImagePlus, Italic, Link2, MoreHorizontal } from 'lucide-react-native';
import TownSquareToolbarButton, { TownSquareToolbarButtonGroup } from './TownSquareToolbarButton';
import Row from '../../layout/Row';

interface TownSquareComposerToolbarProps {
    onBold: () => void;
    onInput?: () => void;
    onImage: () => void;
    onItalic: () => void;
    onLink: () => void;
    onMore: () => void;
    showInputs?: boolean;
}

const iconColor = '#1a1a1a';

const TownSquareComposerToolbar = ({
    onBold,
    onInput,
    onImage,
    onItalic,
    onLink,
    onMore,
    showInputs = false,
}: TownSquareComposerToolbarProps) => {
    return (
        <>
            <Row>
                <TownSquareToolbarButtonGroup>

                    <TownSquareToolbarButton isFirst={true} onPress={onBold}>
                        <Bold color={iconColor} size={20} strokeWidth={2.5} />
                    </TownSquareToolbarButton>
                    <TownSquareToolbarButton onPress={onItalic}>
                        <Italic color={iconColor} size={20} strokeWidth={2.5} />
                    </TownSquareToolbarButton>
                    <TownSquareToolbarButton isLast={true} onPress={onMore}>
                        <MoreHorizontal color={iconColor} size={20} strokeWidth={2.5} />
                    </TownSquareToolbarButton>
                </TownSquareToolbarButtonGroup>
                <TownSquareToolbarButtonGroup>
                    <TownSquareToolbarButton isFirst={true} onPress={onLink}>
                        <Link2 color={iconColor} size={20} strokeWidth={2.5} />
                    </TownSquareToolbarButton>
                    <TownSquareToolbarButton isLast={!showInputs} onPress={onImage}>
                        <ImagePlus color={iconColor} size={20} strokeWidth={2.5} />
                    </TownSquareToolbarButton>
                    {showInputs ? (
                        <TownSquareToolbarButton isLast={true} onPress={onInput}>
                            <ChevronDown color={iconColor} size={20} strokeWidth={2.5} />
                        </TownSquareToolbarButton>
                    ) : null}
                </TownSquareToolbarButtonGroup>
            </Row>
        </>
    );
};

export default TownSquareComposerToolbar;
