import React from 'react';
import { isIOSSafari } from 'utils/browser';

export const TORN_PAPER_FILTER_ID = 'wolff-torn-paper-edge';
export const TORN_PAPER_FILTER_URL = `url(#${TORN_PAPER_FILTER_ID})`;

/**
 * Deterministic jagged polygon used as a clip-path fallback on iOS Safari,
 * where the displacement filter causes the browser to drop and re-rasterize
 * layer tiles while scrolling. Along-edge positions are %, perpendicular jag
 * is px so the tear stays ~6px deep at any size.
 */
const buildTornEdgeClipPath = () => {
    let seed = 11;
    const rand = () => {
        seed = (seed * 48271) % 2147483647;
        return seed / 2147483647;
    };
    const POINTS_PER_EDGE = 10;
    const jag = () => `${(rand() * 6).toFixed(1)}px`;
    const jagFromFar = () => `calc(100% - ${(rand() * 6).toFixed(1)}px)`;
    const pts: string[] = [];

    for (let i = 0; i <= POINTS_PER_EDGE; i++) {
        pts.push(`${((i / POINTS_PER_EDGE) * 100).toFixed(1)}% ${jag()}`);
    }
    for (let i = 1; i <= POINTS_PER_EDGE; i++) {
        pts.push(`${jagFromFar()} ${((i / POINTS_PER_EDGE) * 100).toFixed(1)}%`);
    }
    for (let i = 1; i <= POINTS_PER_EDGE; i++) {
        pts.push(`${(100 - (i / POINTS_PER_EDGE) * 100).toFixed(1)}% ${jagFromFar()}`);
    }
    for (let i = 1; i < POINTS_PER_EDGE; i++) {
        pts.push(`${jag()} ${(100 - (i / POINTS_PER_EDGE) * 100).toFixed(1)}%`);
    }

    return `polygon(${pts.join(', ')})`;
};

const TORN_EDGE_CLIP_PATH = buildTornEdgeClipPath();

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
      ...(isIOSSafari()
        ? { clipPath: TORN_EDGE_CLIP_PATH }
        : { filter: TORN_PAPER_FILTER_URL }),
      boxShadow: 'inset 0 0 22px rgba(74, 55, 30, 0.4), inset 0 0 4px rgba(74, 55, 30, 0.35)',
      pointerEvents: 'none',
    }}
  />
);
