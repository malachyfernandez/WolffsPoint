import React from 'react';
import { View } from 'react-native';

export const PAPER_TEXTURE_URL =
  'https://dydrl5o9tb.ufs.sh/f/6bPCFkuBjl92dnXGroFLInwCTmuU48v7QcbPaXDEgKZzYeBq';

interface PaperTextureOverlayProps {
  opacity?: number;
  borderRadius?: number;
}

/**
 * Absolute-fill multiply-blend paper grain. Web-only visually (the background
 * image is ignored on native), safe to drop into any `relative` container.
 */
const PaperTextureOverlay = ({ opacity = 0.5, borderRadius = 0 }: PaperTextureOverlayProps) => (
  <View
    pointerEvents="none"
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius,
      opacity,

      // --- Web-Only Properties ---
      // @ts-ignore: RN types don't know about web CSS
      backgroundImage: `url('${PAPER_TEXTURE_URL}')`,
      backgroundRepeat: 'repeat',
      backgroundSize: '642px 642px',
      mixBlendMode: 'multiply',
    }}
  />
);

export default PaperTextureOverlay;
