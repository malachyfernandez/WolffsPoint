import React from 'react';
import { isMobileWeb } from 'utils/browser';

export const TORN_PAPER_FILTER_ID = 'wolff-torn-paper-edge';
export const TORN_PAPER_FILTER_URL = `url(#${TORN_PAPER_FILTER_ID})`;

/**
 * Deterministic jagged polygon used as a clip-path fallback on mobile web
 * browsers, where the displacement filter causes the browser to drop and
 * re-rasterize layer tiles while scrolling. Points are generated per pixel of
 * edge length (PX_PER_POINT) so the tear has consistent density on edges of
 * any length — along-edge positions are %, perpendicular jag is px.
 */
const PX_PER_POINT = 7;

const buildTornEdgeClipPath = (width: number, height: number) => {
    let seed = 11;
    const rand = () => {
        seed = (seed * 48271) % 2147483647;
        return seed / 2147483647;
    };
    // Mostly shallow nicks with occasional deeper tears, like real ripped paper
    const depth = () => (rand() < 0.15 ? 4 + rand() * 5 : rand() * 4.5);
    const jag = () => `${depth().toFixed(1)}px`;
    const jagFromFar = () => `calc(100% - ${depth().toFixed(1)}px)`;

    // Jittered positions along an edge of the given pixel length, as 0..1 fractions
    const edgePoints = (length: number) => {
        const count = Math.max(4, Math.round(length / PX_PER_POINT));
        const points: number[] = [];
        for (let i = 0; i <= count; i++) {
            const jitter = i === 0 || i === count ? 0 : (rand() - 0.5) * (0.8 / count);
            points.push(Math.min(1, Math.max(0, i / count + jitter)));
        }
        return points;
    };

    const xs = edgePoints(width);
    const ys = edgePoints(height);
    const pct = (f: number) => `${(f * 100).toFixed(2)}%`;
    const pts: string[] = [];

    // top edge, left → right (includes both corners)
    xs.forEach((x) => pts.push(`${pct(x)} ${jag()}`));
    // right edge, top → bottom
    ys.slice(1).forEach((y) => pts.push(`${jagFromFar()} ${pct(y)}`));
    // bottom edge, right → left
    [...xs].reverse().slice(1).forEach((x) => pts.push(`${pct(x)} ${jagFromFar()}`));
    // left edge, bottom → top
    [...ys].reverse().slice(1, -1).forEach((y) => pts.push(`${jag()} ${pct(y)}`));

    return `polygon(${pts.join(', ')})`;
};

const tornEdgeClipPathCache = new Map<string, string>();
const getTornEdgeClipPath = (width: number, height: number) => {
    const key = `${width}x${height}`;
    let clipPath = tornEdgeClipPathCache.get(key);
    if (!clipPath) {
        clipPath = buildTornEdgeClipPath(width, height);
        tornEdgeClipPathCache.set(key, clipPath);
    }
    return clipPath;
};

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
export const TornPaperBackground = ({ textureUrl, tileSize }: TornPaperBackgroundProps) => {
  const paperRef = React.useRef<HTMLDivElement>(null);
  const [clipPath, setClipPath] = React.useState<string>();
  const mobileWeb = React.useMemo(() => isMobileWeb(), []);

  React.useLayoutEffect(() => {
    if (!mobileWeb) {
      return;
    }
    const element = paperRef.current;
    if (!element) {
      return;
    }
    const update = () =>
      setClipPath(getTornEdgeClipPath(element.offsetWidth, element.offsetHeight));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [mobileWeb]);

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          right: 10,
          bottom: 10,
          boxShadow: '0px 8px 18px rgba(0, 0, 0, 0.4)',
          pointerEvents: 'none',
        }}
      />
      <div
        ref={paperRef}
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
          ...(mobileWeb ? { clipPath } : { filter: TORN_PAPER_FILTER_URL }),
          boxShadow: 'inset 0 0 22px rgba(74, 55, 30, 0.4), inset 0 0 4px rgba(74, 55, 30, 0.35)',
          pointerEvents: 'none',
        }}
      />
    </>
  );
};
