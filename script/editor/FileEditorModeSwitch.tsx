import React from 'react';
import { Pressable } from 'react-native';
import Row from '../../components/layout/Row';
import FontText from '../../components/ui/text/FontText';

export default function FileEditorModeSwitch({
  markdown,
  onChange,
}: {
  markdown: boolean;
  onChange: (markdown: boolean) => void;
}) {
  return (
    <Row className="border-subtle-border shrink-0 gap-0 overflow-hidden rounded-lg border">
      {['Markdown', 'Source'].map((label, index) => {
        const active = markdown === (index === 0);
        return (
          <Pressable
            key={label}
            accessibilityRole="button"
            accessibilityLabel={`${label} editor`}
            accessibilityState={{ selected: active }}
            onPress={() => onChange(index === 0)}
            className={`px-3 py-2 ${active ? 'bg-text' : 'hover:bg-text/5'}`}>
            <FontText className="text-xs" color={active ? 'text-inverted' : undefined}>
              {label}
            </FontText>
          </Pressable>
        );
      })}
    </Row>
  );
}
