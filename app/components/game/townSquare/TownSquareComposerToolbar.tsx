import React from 'react';
import {
    Bold,
    ChevronDown,
    Code,
    ImagePlus,
    Italic,
    Link2,
    MoreHorizontal,
    Variable,
} from 'lucide-react-native';
import TownSquareToolbarButton, { TownSquareToolbarButtonGroup } from './TownSquareToolbarButton';
import Row from '../../layout/Row';

interface TownSquareComposerToolbarProps {
    onBold: () => void;
    onInput?: () => void;
    onImage: () => void;
    onItalic: () => void;
    onLink: () => void;
    onMore: () => void;
    onScript?: () => void;
    onVariable?: () => void;
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
    onScript,
    onVariable,
    showInputs = false,
}: TownSquareComposerToolbarProps) => {
    return (
        <>
            <Row className='gap-2 flex-wrap'>
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
                    <TownSquareToolbarButton
                        isLast={!showInputs && !onScript && !onVariable}
                        onPress={onImage}>
                        <ImagePlus color={iconColor} size={20} strokeWidth={2.5} />
                    </TownSquareToolbarButton>
                    {showInputs ? (
                        <TownSquareToolbarButton isLast={!onScript && !onVariable} onPress={onInput}>
                            <ChevronDown color={iconColor} size={20} strokeWidth={2.5} />
                        </TownSquareToolbarButton>
                    ) : null}
                    {onScript ? (
                        <TownSquareToolbarButton isLast={!onVariable} onPress={onScript}>
                            <Code color={iconColor} size={20} strokeWidth={2.5} />
                        </TownSquareToolbarButton>
                    ) : null}
                    {onVariable ? (
                        <TownSquareToolbarButton isLast={true} onPress={onVariable}>
                            <Variable color={iconColor} size={20} strokeWidth={2.5} />
                        </TownSquareToolbarButton>
                    ) : null}
                </TownSquareToolbarButtonGroup>
            </Row>
        </>
    );
};

export default TownSquareComposerToolbar;
