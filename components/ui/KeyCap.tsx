import React from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';

interface KeyCapProps {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

const KeyCap = ({ children, style }: KeyCapProps) => (
  <Text
    style={[
      {
        minWidth: 20,
        paddingHorizontal: 5,
        borderWidth: 1,
        borderBottomWidth: 3,
        borderColor: '#d1d5db',
        borderBottomColor: '#9ca3af',
        borderRadius: 5,
        backgroundColor: '#f9fafb',
        color: '#1f2937',
        fontSize: 11,
        fontWeight: '600',
        lineHeight: 15,
        textAlign: 'center',
        overflow: 'hidden',
      },
      style,
    ]}>
    {children}
  </Text>
);

export default KeyCap;
