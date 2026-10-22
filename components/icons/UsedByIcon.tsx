import React from 'react';
import Svg, { G, Path } from 'react-native-svg';

interface UsedByIconProps {
  size?: number;
  color?: string;
}

/** Lucide "corner-down-right" shape with the arrowhead moved to the top
 *  end: the branch starts at the placements and points back up at the file
 *  that owns them, so the row reads "used by this file". */
const UsedByIcon = ({ size = 24, color = 'currentColor' }: UsedByIconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <G fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
      <Path d="M4 4v7a4 4 0 0 0 4 4h12" />
      <Path d="m7 7-3-3-3 3" />
    </G>
  </Svg>
);

export default UsedByIcon;
