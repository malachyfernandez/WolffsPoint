import type { InputType } from '../registry';

/**
 * Shared color palette for the script editor.
 *
 * Every block category (statement + expression) and every socket input type
 * maps to a `BlockTint`. Related things intentionally share hue families:
 *
 * - Blues/purples — data & structure (data, list, function, variable)
 * - Warm hues    — logic & flow (boolean, operator, control, math)
 * - Greens       — player-facing I/O (input, display)
 * - Red          — table writes (side effects)
 * - Pink         — text
 *
 * `bg` is a translucent fill that lets the paper texture show through.
 * `soft` is a fainter fill used for the header/footer strips of container
 * blocks (If, ForEach, Function, UpdateCell, OnTag*). `border` is the
 * mid-strength accent; `solid` is the full-strength color used for small
 * dots/connectors/tab pills where translucency would read as grey.
 */
export interface BlockTint {
  bg: string;
  soft: string;
  border: string;
  solid: string;
}

const tint = (solid: string, bgAlpha = 0.22, softAlpha = 0.12): BlockTint => ({
  bg: `${solid}${Math.round(bgAlpha * 255)
    .toString(16)
    .padStart(2, '0')}`,
  soft: `${solid}${Math.round(softAlpha * 255)
    .toString(16)
    .padStart(2, '0')}`,
  border: `${solid}66`,
  solid,
});

export const NEUTRAL_TINT: BlockTint = {
  bg: 'rgba(0,0,0,0.05)',
  soft: 'rgba(0,0,0,0.04)',
  border: 'rgba(0,0,0,0.15)',
  solid: '#4B5563',
};

/** Colors keyed by block category (same keys as CATEGORY_LABELS in InsertModal). */
export const CATEGORY_TINTS: Record<string, BlockTint> = {
  // data & structure — blue family
  data: tint('#1D4ED8'),
  list: tint('#4338CA'),
  function: tint('#7E22CE'),
  variable: tint('#475569'),
  object: tint('#1D4ED8'),
  // logic & flow — warm family
  boolean: tint('#A16207'),
  operator: tint('#B45309'),
  control: tint('#92400E'),
  math: tint('#C2410C'),
  number: tint('#C2410C'),
  // player-facing I/O — greens
  input: tint('#15803D'),
  display: tint('#0F766E'),
  // table writes — red (side effects)
  table: tint('#B91C1C'),
  // text — pink
  string: tint('#BE185D'),
  // modal-only categories
  suggested: tint('#4B5563', 0.12, 0.08),
};

export const getCategoryTint = (category?: string | null): BlockTint =>
  (category && CATEGORY_TINTS[category]) || NEUTRAL_TINT;

/**
 * Colors keyed by socket input type — what a block "takes in". They reuse the
 * same hues as the categories that produce those values, so a LIST socket is
 * indigo like list blocks, a BOOLEAN socket is yellow like boolean blocks, etc.
 */
export const INPUT_TYPE_TINTS: Record<InputType, BlockTint> = {
  string: CATEGORY_TINTS.string,
  number: CATEGORY_TINTS.math,
  boolean: CATEGORY_TINTS.boolean,
  list: CATEGORY_TINTS.list,
  expression: CATEGORY_TINTS.variable,
  lambda: CATEGORY_TINTS.function,
  markdown: CATEGORY_TINTS.display,
};

export const getInputTypeTint = (type?: InputType | null): BlockTint =>
  (type && INPUT_TYPE_TINTS[type]) || NEUTRAL_TINT;
