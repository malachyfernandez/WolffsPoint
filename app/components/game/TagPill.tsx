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
  { name: 'Red', bg: '#B91C1C', text: '#FFFFFF' },
  { name: 'Orange', bg: '#C2410C', text: '#FFFFFF' },
  { name: 'Amber', bg: '#B45309', text: '#FFFFFF' },
  { name: 'Green', bg: '#15803D', text: '#FFFFFF' },
  { name: 'Teal', bg: '#0F766E', text: '#FFFFFF' },
  { name: 'Blue', bg: '#1D4ED8', text: '#FFFFFF' },
  { name: 'Indigo', bg: '#4338CA', text: '#FFFFFF' },
  { name: 'Purple', bg: '#7E22CE', text: '#FFFFFF' },
  { name: 'Pink', bg: '#BE185D', text: '#FFFFFF' },
  { name: 'Grey', bg: '#374151', text: '#FFFFFF' },
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

  // When there's no press handler, render as a plain View so touch events
  // bubble up to any parent Pressable (e.g. TagCellDisplay's open-editor press).
  if (!onPress && !onRemove) {
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
      </View>
    );
  }

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
