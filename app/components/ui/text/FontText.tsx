import React, { PropsWithChildren } from 'react';
import { Text, TextStyle, LayoutChangeEvent } from 'react-native';
import { useFonts } from 'expo-font';
import { useCSSVariable, useResolveClassNames } from 'uniwind';

type FontWeight = 'regular' | 'medium' | 'bold';
type FontTextVariant = 'default' | 'heading' | 'subtext' | 'cardHeader' | 'lowercaseCardHeader';
type TextColor = 'black' | 'white' | 'red';

interface FontTextProps extends PropsWithChildren {
  className?: string;
  weight?: FontWeight;
  variant?: FontTextVariant;
  color?: TextColor | string | 'text-inverted';
  style?: TextStyle;
  onLayout?: (event: LayoutChangeEvent) => void;
  numberOfLines?: number;
  ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
}

const WEIGHT_MAP: Record<FontWeight, '400' | '500' | '700'> = {
  regular: '400',
  medium: '500',
  bold: '700',
};

const TEXT_UTIL_CLASSES = new Set([
  'text-text',
  'text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl',
  'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl', 'text-6xl', 'text-7xl', 'text-8xl', 'text-9xl',
  'text-left', 'text-right', 'text-center', 'text-justify', 'text-start', 'text-end',
  'text-wrap', 'text-nowrap', 'text-balance', 'text-pretty', 'text-ellipsis', 'text-clip',
  'text-inherit', 'text-current', 'text-transparent',
]);

const getColorTokenFromClassName = (className: string): string | null => {
  const matches = className.match(/text-[a-zA-Z0-9-]+/g);
  if (!matches) return null;
  for (let i = matches.length - 1; i >= 0; i--) {
    const token = matches[i];
    if (!TEXT_UTIL_CLASSES.has(token)) {
      return token.replace(/^text-/, '');
    }
  }
  return null;
};

const FontText = ({
  children,
  className = '',
  weight = 'regular',
  variant = 'default',
  color,
  style,
  onLayout,
  numberOfLines,
  ellipsizeMode,
}: FontTextProps) => {
  const [fontsLoaded] = useFonts({
    LibreBaskerville: require('../../../../assets/fonts/Libre_Baskerville/LibreBaskerville-VariableFont_wght.ttf'),
  });

  const colorToken = color || getColorTokenFromClassName(className) || 'text';
  const colorClass = `text-${colorToken}`;
  const resolvedStyle = useResolveClassNames(colorClass);
  const resolvedColor = String(resolvedStyle?.color ?? (useCSSVariable(`--color-${colorToken}`) || colorToken));

  if (variant === 'subtext') {
    className += ' text-xs opacity-70';
  }

  if (variant === 'cardHeader') {
    className += ' text-xs opacity-70 uppercase tracking-wider';
  }

  if (variant === 'lowercaseCardHeader') {
    className += ' text-xs opacity-70 tracking-wider';
  }

  if (!fontsLoaded) {
    return (
      <Text
        className={`text-text ${className}`}
        style={{ color: resolvedColor, ...style }}
        onLayout={onLayout}
        numberOfLines={numberOfLines}
        ellipsizeMode={ellipsizeMode}>
        {children}
      </Text>
    );
  }

  return (
    <Text
      className={`text-text ${className}`}
      style={{
        fontFamily: 'LibreBaskerville',
        fontWeight: WEIGHT_MAP[weight] as '400' | '500' | '700',
        color: resolvedColor,
        ...style,
      }}
      onLayout={onLayout}
      numberOfLines={numberOfLines}
      ellipsizeMode={ellipsizeMode}>
      {children}
    </Text>
  );
};

export default FontText;
