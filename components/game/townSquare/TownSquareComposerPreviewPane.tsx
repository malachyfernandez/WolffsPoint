import React from 'react';
import ShadowScrollView from '../../ui/ShadowScrollView';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import AppButton from '../../ui/buttons/AppButton';
import MarkdownRenderer from '../../ui/markdown/MarkdownRenderer';
import FontText from '../../ui/text/FontText';

interface TownSquareComposerPreviewPaneProps {
  includeTitle: boolean;
  markdown: string;
  markdownInputState?: Record<string, string | undefined>;
  setMarkdownInputState?: (nextState: Record<string, string | undefined>) => void;
  title: string;
  centered?: boolean;
  showPreviewAsPlayer?: boolean;
  onPreviewAsPlayer?: () => void;
}

const TownSquareComposerPreviewPane = ({
  includeTitle,
  markdown,
  markdownInputState,
  setMarkdownInputState,
  title,
  centered = false,
  showPreviewAsPlayer = false,
  onPreviewAsPlayer,
}: TownSquareComposerPreviewPaneProps) => {
  return (
    <Column className="min-w-0 flex-1 gap-2">
      <Row className="items-center justify-end">
        {showPreviewAsPlayer && onPreviewAsPlayer && (
          <AppButton
            variant="outline"
            className="h-7 px-2"
            onPress={onPreviewAsPlayer}
            dropShadow={false}>
            <FontText className="text-xs">Preview As Player</FontText>
          </AppButton>
        )}
      </Row>
      <ShadowScrollView
        className="h-[52vh] flex-1"
        scrollViewClassName="h-[52vh] flex-1 border border-subtle-border px-4 py-4">
        <Column className="gap-3">
          {includeTitle && title.trim() ? (
            <FontText weight="bold" className="text-2xl leading-8">
              {title.trim()}
            </FontText>
          ) : null}

          {markdown.trim() ? (
            <MarkdownRenderer
              markdown={markdown.trim()}
              state={markdownInputState}
              setState={setMarkdownInputState}
              isInDialog={true}
              textAlign={centered ? 'center' : undefined}
            />
          ) : (
            <Column className="gap-1 py-12">
              <FontText weight="medium">Nothing to preview yet</FontText>
              <FontText variant="subtext">Start typing in the Editing tab.</FontText>
            </Column>
          )}
        </Column>
      </ShadowScrollView>
    </Column>
  );
};

export default TownSquareComposerPreviewPane;
