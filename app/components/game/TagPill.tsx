import React from 'react';
import { Pressable, View } from 'react-native';
import FontText from '../ui/text/FontText';
import { X } from 'lucide-react-native';

export interface TagColor {
  name: string;
  bg: string;
  text: string;
}

/** Preset color palette for tags */
export const TAG_COLORS: TagColor[] = [
  { name: 'Red', bg: '#EF4444', text: '#FFFFFF' },
  { name: 'Orange', bg: '#F97316', text: '#FFFFFF' },
  { name: 'Amber', bg: '#F59E0B', text: '#1F2937' },
  { name: 'Green', bg: '#22C55E', text: '#FFFFFF' },
  { name: 'Teal', bg: '#14B8A6', text: '#FFFFFF' },
  { name: 'Blue', bg: '#3B82F6', text: '#FFFFFF' },
  { name: 'Indigo', bg: '#6366F1', text: '#FFFFFF' },
  { name: 'Purple', bg: '#A855F7', text: '#FFFFFF' },
  { name: 'Pink', bg: '#EC4899', text: '#FFFFFF' },
  { name: 'Grey', bg: '#6B7280', text: '#FFFFFF' },
];

/** Get a TagColor by name, falling back to grey */
export const getTagColor = (colorName: string): TagColor =>
  TAG_COLORS.find((c) => c.name === colorName) ?? TAG_COLORS[TAG_COLORS.length - 1];

interface TagPillProps {
  label: string;
  color: TagColor;
  onPress?: () => void;
  onRemove?: () => void;
  selected?: boolean;
  size?: 'sm' | 'md';
  /** Optional max width in px — long labels truncate with an ellipsis. */
  maxWidth?: number;
}

/**
 * A colored pill/chip that displays a tag name.
 */
const TagPill = ({
  label,
  color,
  onPress,
  onRemove,
  selected,
  size = 'md',
  maxWidth,
}: TagPillProps) => {
  const padding = size === 'sm' ? 'px-2 py-0.5' : 'px-3 py-1';
  const fontSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const textMaxWidth = maxWidth ? maxWidth - (size === 'sm' ? 16 : 24) : undefined;

  if (onRemove) {
    return (
      <View
        className={`flex-row items-center rounded-full ${padding}`}
        style={{ backgroundColor: color.bg, maxWidth }}>
        <FontText
          weight="medium"
          className={fontSize}
          style={{ color: color.text, maxWidth: textMaxWidth }}
          numberOfLines={1}
          ellipsizeMode="tail">
          {label}
        </FontText>
        <Pressable onPress={onRemove} className="ml-1.5">
          <X size={size === 'sm' ? 12 : 14} color={color.text} />
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full ${padding} ${selected ? 'ring-2 ring-offset-1' : ''}`}
      style={{ backgroundColor: color.bg, maxWidth }}>
      <FontText
        weight="medium"
        className={fontSize}
        style={{ color: color.text, maxWidth: textMaxWidth }}
        numberOfLines={1}
        ellipsizeMode="tail">
        {label}
      </FontText>
    </Pressable>
  );
};

export default TagPill;
