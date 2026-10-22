import type { DayData, UserTableItem } from '../types/playerTable';
import type { PlannedUpdate } from '../types/multiplayer';
import { deepEqual } from './deepEqual';
import { cellTagRefs, parseCellPieces, serializePiece } from './cellPieces';
import { getFileCallParts, parseFileCell } from './scriptFiles';

export type TrackedValue =
  | string
  | string[]
  | number
  | Record<string, string | undefined>
  | undefined;
export type FieldWrite = {
  id: string;
  source: string;
  value?: TrackedValue;
  /** Sources explicitly superseded by an operator, retained across re-certification. */
  overrides?: string[];
};
export type FieldHistory = {
  base?: TrackedValue;
  writes: FieldWrite[];
  /** Bind an unchanged legacy submission once, not to new row positions on every replay. */
  submissionBinding?: { fingerprint: string; updates: PlannedUpdate[] };
};
export type FieldProvenance = Record<string, FieldHistory>;

export const TRACKED_CERT_PREFIX = 'certification:';
export const TRACKED_TAG_PREFIX = 'tag:tracked:';
export const isAutomaticSource = (source: string) => {
  const normalized = source.replace(/^persistent:/, '');
  return (
    normalized.startsWith(TRACKED_CERT_PREFIX) ||
    normalized.startsWith(TRACKED_TAG_PREFIX) ||
    normalized.startsWith('tag:removed:')
  );
};
export const isManualSource = (source: string) => source.startsWith('manual:');
export const certificationScope = (source: string) =>
  source.startsWith(TRACKED_CERT_PREFIX) ? source.split('|')[0] : null;
export const fieldValue = (history: FieldHistory): TrackedValue =>
  history.writes.length ? history.writes[history.writes.length - 1].value : history.base;

let writeSequence = 0;
const writeId = () =>
  `w${Date.now().toString(36)}_${(writeSequence++).toString(36)}_${Math.random().toString(36).slice(2, 9)}`;

export const writeField = (
  provenance: FieldProvenance | undefined,
  field: string,
  current: TrackedValue,
  value: TrackedValue,
  source: string
): FieldProvenance => {
  const history = provenance?.[field] ?? { base: current, writes: [] };
  return {
    ...provenance,
    [field]: {
      ...history,
      writes: [
        ...history.writes.filter((write) => !isManualSource(write.source)),
        { id: writeId(), source, value },
        ...history.writes.filter((write) => isManualSource(write.source)),
      ],
    },
  };
};

export const writeManualField = (
  provenance: FieldProvenance | undefined,
  field: string,
  current: TrackedValue,
  value: TrackedValue
): FieldProvenance | undefined => {
  const history = provenance?.[field];
  // Before the first automatic write the value is simply the untracked base.
  if (!history) return provenance;
  const overrides = [
    ...new Set(
      history.writes.flatMap((write) =>
        isAutomaticSource(write.source) ? [write.source] : (write.overrides ?? [])
      )
    ),
  ];
  if (!overrides.length) {
    return { ...provenance, [field]: { ...history, base: value, writes: [] } };
  }
  return {
    ...provenance,
    [field]: {
      ...history,
      // A new manual assertion supersedes earlier manual assertions, not other owners.
      writes: [
        ...history.writes.filter((write) => !isManualSource(write.source)),
        { id: writeId(), source: `manual:${writeId()}`, value, overrides },
      ],
    },
  };
};

const DAY_FIELDS = ['vote', 'voteInputs', 'voteInputKey', 'voteMultiplier', 'action'] as const;

/** Common setter boundary: automatic operations carry updated histories;
 * ordinary editor/bulk writes carry the old history and become manual events. */
export const trackManualTableChanges = (
  before: UserTableItem[],
  after: UserTableItem[]
): UserTableItem[] =>
  after.map((user, index) => {
    const previous = user.id
      ? before.find((item) => item.id === user.id)
      : (before.find((item) => item.email === user.email) ?? before[index]);
    if (!previous) return user;
    let playerData = {
      ...user.playerData,
      fieldProvenance:
        previous.playerData.fieldProvenance || user.playerData.fieldProvenance
          ? { ...previous.playerData.fieldProvenance, ...user.playerData.fieldProvenance }
          : undefined,
      extraColumns: user.playerData.extraColumns?.map((raw, column) =>
        previous.playerData.extraColumns?.length !== user.playerData.extraColumns?.length
          ? raw
          : trackManualStringChange(previous.playerData.extraColumns?.[column] ?? '', raw)
      ),
    };
    if (
      !deepEqual(previous.playerData.livingState, playerData.livingState) &&
      deepEqual(
        previous.playerData.fieldProvenance?.livingState,
        playerData.fieldProvenance?.livingState
      )
    ) {
      playerData = {
        ...playerData,
        fieldProvenance: writeManualField(
          playerData.fieldProvenance,
          'livingState',
          previous.playerData.livingState,
          playerData.livingState
        ),
      };
    }
    const days = user.days.map((day, dayIndex) => {
      const old = day.id
        ? previous.days.find((item) => item.id === day.id)
        : previous.days[dayIndex];
      if (!old) return day;
      // Older clients/normalizers may omit new metadata. Ordinary writes must
      // not erase it; explicit 'restore' snapshots bypass this boundary.
      let provenance =
        old.fieldProvenance || day.fieldProvenance
          ? { ...old.fieldProvenance, ...day.fieldProvenance }
          : undefined;
      for (const field of DAY_FIELDS) {
        if (
          !deepEqual(old[field], day[field]) &&
          deepEqual(old.fieldProvenance?.[field], provenance?.[field])
        ) {
          provenance = writeManualField(provenance, field, old[field], day[field]);
        }
      }
      return {
        ...day,
        id: day.id ?? old.id,
        fieldProvenance: provenance,
        extraColumns: day.extraColumns?.map((raw, column) =>
          old.extraColumns?.length !== day.extraColumns?.length
            ? raw
            : trackManualStringChange(old.extraColumns?.[column] ?? '', raw)
        ),
      };
    });
    return { ...user, id: user.id ?? previous.id, playerData, days };
  });

export const stripFieldSources = (
  provenance: FieldProvenance | undefined,
  prefix: string,
  exact: boolean
): { provenance: FieldProvenance | undefined; values: Record<string, TrackedValue> } => {
  if (!provenance) return { provenance, values: {} };
  const values: Record<string, TrackedValue> = {};
  const next = { ...provenance };
  for (const [field, history] of Object.entries(provenance)) {
    const writes = history.writes.filter((write) =>
      exact ? write.source !== prefix : !write.source.startsWith(prefix)
    );
    if (writes.length === history.writes.length) continue;
    next[field] = { ...history, writes };
    values[field] = fieldValue(next[field]);
  }
  return { provenance: next, values };
};

export const latestFieldSource = (
  provenance: FieldProvenance | undefined,
  field: string,
  current: TrackedValue
): string | undefined => {
  const history = provenance?.[field];
  if (!history || !deepEqual(fieldValue(history), current)) return undefined;
  const source = history.writes[history.writes.length - 1]?.source;
  return source && isAutomaticSource(source) ? source : undefined;
};

export const manualFieldScopes = (history: FieldHistory): string[] => [
  ...new Set(
    history.writes.flatMap((write) =>
      (write.overrides ?? []).map(certificationScope).filter((scope): scope is string => !!scope)
    )
  ),
];

export const assertManualDayField = (
  day: DayData,
  field: (typeof DAY_FIELDS)[number]
): DayData => ({
  ...day,
  fieldProvenance: writeManualField(day.fieldProvenance, field, day[field], day[field]),
});

export const manualSources = (source: string): string[] => {
  if (!source.startsWith('manual:override:')) return [];
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(source.slice('manual:override:'.length)));
    return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string') ? parsed : [];
  } catch {
    return [];
  }
};

/** Keep each manual REM/SET's particular automatic owners in its source label.
 * Manual additions do not become conflicts just because the cell is certified. */
export const trackManualStringChange = (before: string, after: string): string => {
  if (before === after) return after;
  const original = parseCellPieces(before);
  const sources = [
    ...new Set(
      original.pieces.flatMap((piece) =>
        isAutomaticSource(piece.src) ? [piece.src] : manualSources(piece.src)
      )
    ),
  ];
  if (!sources.length) return after;
  const encode = (owners: string[]) =>
    `manual:override:${encodeURIComponent(JSON.stringify(owners))}`;
  if (!after.startsWith(before)) {
    // Imported/raw manual replacement remains an operation, not loss of the stream.
    return before + serializePiece({ kind: 'set', text: after, src: encode(sources) });
  }
  const suffix = after.slice(before.length);
  const parsed = parseCellPieces(suffix);
  if (parsed.base) return after;
  return (
    before +
    parsed.pieces
      .map((piece) => {
        if (piece.src !== 'manual' || (piece.kind !== 'rem' && piece.kind !== 'set')) {
          return serializePiece(piece);
        }
        const affected =
          piece.kind === 'set'
            ? sources
            : original.pieces
                .filter((candidate) => {
                  if (!isAutomaticSource(candidate.src)) return false;
                  const match = piece.match;
                  if (match.type === 'src') return candidate.src === match.src;
                  if (match.type === 'file')
                    return (
                      (candidate.kind === 'file' && candidate.fileId === match.fileId) ||
                      (candidate.kind === 'set' &&
                        (parseFileCell(candidate.text) ?? []).some((statement) => {
                          const ref = getFileCallParts(statement);
                          return (
                            ref?.id === match.fileId ||
                            ref?.path.toLowerCase() === match.fileId.toLowerCase()
                          );
                        }))
                    );
                  if (match.type === 'tagid')
                    return (
                      (candidate.kind === 'tag' && candidate.tagId === match.tagId) ||
                      ((candidate.kind === 'set' || candidate.kind === 'text') &&
                        cellTagRefs(candidate.text).some((ref) => ref.tagId === match.tagId))
                    );
                  if (match.type === 'tag')
                    return (
                      (candidate.kind === 'tag' &&
                        candidate.name.toLowerCase() === match.name.toLowerCase()) ||
                      ((candidate.kind === 'set' || candidate.kind === 'text') &&
                        cellTagRefs(candidate.text).some(
                          (ref) => ref.name.toLowerCase() === match.name.toLowerCase()
                        ))
                    );
                  if (match.type === 'display')
                    return candidate.kind === 'display' && candidate.pieceId === match.pieceId;
                  return (
                    match.type === 'text' &&
                    (candidate.kind === 'text' || candidate.kind === 'set') &&
                    candidate.text.includes(match.substring)
                  );
                })
                .map((candidate) => candidate.src);
        return serializePiece({
          ...piece,
          src: affected.length ? encode([...new Set(affected)]) : piece.src,
        });
      })
      .join('')
  );
};

export const trackManualMessages = (
  before: Record<string, string[]>,
  after: Record<string, string[]>
): Record<string, string[]> =>
  Object.fromEntries(
    Object.entries(after).map(([email, messages]) => [
      email,
      messages.map((message, day) => trackManualStringChange(before[email]?.[day] ?? '', message)),
    ])
  );
