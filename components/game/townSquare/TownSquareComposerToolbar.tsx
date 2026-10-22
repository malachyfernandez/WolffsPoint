import React from 'react';
import {
  Bold,
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
  onImage: () => void;
  onItalic: () => void;
  onLink: () => void;
  onMore: () => void;
  onScript?: () => void;
  onVariable?: () => void;
  scriptLabel?: string;
}

const iconColor = '#1a1a1a';

const TownSquareComposerToolbar = ({
  onBold,
  onImage,
  onItalic,
  onLink,
  onMore,
  onScript,
  onVariable,
  scriptLabel = 'Insert script',
}: TownSquareComposerToolbarProps) => {
  return (
    <>
      <Row className="flex-wrap gap-2">
        <TownSquareToolbarButtonGroup>
          <TownSquareToolbarButton label="Bold" isFirst={true} onPress={onBold}>
            <Bold color={iconColor} size={20} strokeWidth={2.5} />
          </TownSquareToolbarButton>
          <TownSquareToolbarButton label="Italic" onPress={onItalic}>
            <Italic color={iconColor} size={20} strokeWidth={2.5} />
          </TownSquareToolbarButton>
          <TownSquareToolbarButton label="More formatting" isLast={true} onPress={onMore}>
            <MoreHorizontal color={iconColor} size={20} strokeWidth={2.5} />
          </TownSquareToolbarButton>
        </TownSquareToolbarButtonGroup>
        <TownSquareToolbarButtonGroup>
          <TownSquareToolbarButton label="Insert link" isFirst={true} onPress={onLink}>
            <Link2 color={iconColor} size={20} strokeWidth={2.5} />
          </TownSquareToolbarButton>
          <TownSquareToolbarButton
            label="Insert image"
            isLast={!onScript && !onVariable}
            onPress={onImage}>
            <ImagePlus color={iconColor} size={20} strokeWidth={2.5} />
          </TownSquareToolbarButton>
          {onScript ? (
            <TownSquareToolbarButton label={scriptLabel} isLast={!onVariable} onPress={onScript}>
              <Code color={iconColor} size={20} strokeWidth={2.5} />
            </TownSquareToolbarButton>
          ) : null}
          {onVariable ? (
            <TownSquareToolbarButton label="Insert variable" isLast={true} onPress={onVariable}>
              <Variable color={iconColor} size={20} strokeWidth={2.5} />
            </TownSquareToolbarButton>
          ) : null}
        </TownSquareToolbarButtonGroup>
      </Row>
    </>
  );
};

export default TownSquareComposerToolbar;
