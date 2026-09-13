import React from 'react';
import { View } from 'react-native';

/**
 * Divider rendered between newspaper sections. Matches the markdown `---`
 * horizontal rule style used by MarkdownRenderer so sections read like a
 * continuous newspaper separated by simple rules.
 */
const NewspaperSectionDivider = () => {
  return <View className="bg-border h-px w-[calc(100%-32px)] mx-4 opacity-60" />;
};

export default NewspaperSectionDivider;
