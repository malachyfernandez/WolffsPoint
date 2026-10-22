import React from 'react';
import { View } from 'react-native';

/**
 * Divider rendered between newspaper sections. Matches the markdown `---`
 * horizontal rule style used by MarkdownRenderer so sections read like a
 * continuous newspaper separated by simple rules.
 */
const NewspaperSectionDivider = () => {
  return <View className="bg-border mx-4 h-px self-stretch opacity-60" />;
};

export default NewspaperSectionDivider;
