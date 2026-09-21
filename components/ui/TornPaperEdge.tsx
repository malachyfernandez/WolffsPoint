import React from 'react';
import { View } from 'react-native';

/**
 * Native fallback — no SVG filter support, so the paper layer is a flat sheet.
 */
export const TornPaperEdgeDefs = () => null;

interface TornPaperBackgroundProps {
  textureUrl: string;
  tileSize: number;
}

export const TornPaperBackground = (_props: TornPaperBackgroundProps) => (
  <View
    pointerEvents="none"
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#e9e1d0',
    }}
  />
);
