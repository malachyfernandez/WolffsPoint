import * as React from "react";
import Svg, { Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";

interface IconProps extends SvgProps {
  color?: string;
  strokeWidth?: number;
}

// Folder glyph: the tab bar passes strokeWidth=0 by default, so a minimum
// keeps the outline visible like the other hand-drawn icon paths.
const SvgFiles = ({ color = "#000", strokeWidth = 0, ...props }: IconProps) => (
  <Svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={Math.max(strokeWidth, 1.8)}
    {...props}>
    <Path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"
    />
  </Svg>
);
export default SvgFiles;
