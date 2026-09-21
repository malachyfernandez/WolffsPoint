import React from 'react';

export const TORN_PAPER_FILTER_ID = 'wolff-torn-paper-edge';
export const TORN_PAPER_FILTER_URL = `url(#${TORN_PAPER_FILTER_ID})`;

/**
 * SVG filter defs that roughen an element's silhouette into a torn-paper edge.
 * Render once anywhere in the tree above a `TornPaperBackground` (or any element
 * using `filter: url(#wolff-torn-paper-edge)`). Displacement only nibbles the
 * outer ~6px of the paper layer; content should sit in a sibling element so
 * text stays crisp.
 */
export const TornPaperEdgeDefs = () => (
  <svg aria-hidden="true" focusable="false" style={{ position: 'absolute', width: 0, height: 0 }}>
    <defs>
      <filter
        id={TORN_PAPER_FILTER_ID}
        x="-6%"
        y="-6%"
        width="112%"
        height="112%"
        colorInterpolationFilters="sRGB">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.021 0.058"
          numOctaves="5"
          seed="11"
          result="noise"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="noise"
          scale="11"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </defs>
  </svg>
);

interface TornPaperBackgroundProps {
  textureUrl: string;
  tileSize: number;
}

/**
 * Absolute-fill paper layer with a torn silhouette. Sits behind content — pair
 * with a `position: relative` parent. The inset box-shadow rides along the
 * displaced edge so the rim reads as fibrous/darker paper.
 */
export const TornPaperBackground = ({ textureUrl, tileSize }: TornPaperBackgroundProps) => (
  <div
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#e9e1d0',
      backgroundImage: `url('${textureUrl}')`,
      backgroundRepeat: 'repeat',
      backgroundSize: `${tileSize}px ${tileSize}px`,
      filter: TORN_PAPER_FILTER_URL,
      boxShadow: 'inset 0 0 22px rgba(74, 55, 30, 0.4), inset 0 0 4px rgba(74, 55, 30, 0.35)',
      pointerEvents: 'none',
    }}
  />
);
