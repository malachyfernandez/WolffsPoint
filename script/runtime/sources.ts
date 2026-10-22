import type { UserTableItem, UserTableTitle, DayData } from 'types/playerTable';
import type { RoleTableItem } from 'types/roleTable';
import { effectiveCellText, foldCellForResolve } from '../../utils/cellPieces';
import { flattenCellContent, type ScriptFilesIndex } from '../../utils/scriptFiles';
import { isInstantGameDay, parseGameDayDate } from '../../utils/gameDayDuration';

export type ScriptCapability = 'operator' | 'player' | 'newser';

export interface ScriptSourceData {
  capability?: ScriptCapability;
  players?: UserTableItem[];
  roles?: RoleTableItem[];
  currentUserId?: string;
  currentEmail?: string;
  currentDay?: number;
  dayDates?: string[];
  schedule?: Record<string, unknown>;
  profiles?: unknown[];
  userTableTitle?: UserTableTitle;
  /** Morning messages keyed by email → array indexed by day.
   *  When provided, each day entry gets a `morningMessage` field. */
  morningMessagesList?: Record<string, string[]>;
  /** Files index - resolves file pieces inside cell text. */
  filesIndex?: ScriptFilesIndex;
}

/**
 * Convert a DayData into a flat runtime object with extra columns merged in
 * using their column titles as keys. e.g. { vote, action, Infected: "Y", ... }
 */
const dayEntry = (
  day: DayData | undefined,
  extraDayColumnTitles: string[],
  morningMessage?: string,
  filesIndex?: ScriptFilesIndex
) => {
  const base: Record<string, unknown> = {
    vote: day?.vote ?? '',
    action: day?.action ?? '',
    morningMessage: morningMessage ? effectiveCellText(morningMessage, filesIndex) : '',
  };
  const extra = day?.extraColumns ?? [];
  for (let i = 0; i < extraDayColumnTitles.length; i++) {
    // Cells are presented as effective text so `.contains(tag("X"))` and
    // text reads see what the cell actually says, markers included.
    base[extraDayColumnTitles[i]] = effectiveCellText(extra[i] ?? '', filesIndex);
  }
  return base;
};

/**
 * Convert a UserTableItem into a flat runtime object.
 * The player's fields are spread directly so scripts can access
 * `Item.isDead`, `Item.realName`, `Item.role`, etc. without nesting.
 * Extra user columns are merged in using their titles as keys.
 * Day objects also have extra day columns merged in using their titles as keys.
 */
const playerEntry = (
  player: UserTableItem,
  titles?: UserTableTitle,
  morningMessagesForPlayer?: string[],
  filesIndex?: ScriptFilesIndex
) => {
  const extraUserColumnTitles = titles?.extraUserColumns ?? [];
  const extraDayColumnTitles = titles?.extraDayColumns ?? [];

  const base: Record<string, unknown> = {
    realName: player.realName,
    email: player.email,
    userId: player.userId,
    role: player.role,
    isAlive: player.playerData.livingState === 'alive',
    days: (player.days ?? []).map((day, dayIndex) =>
      dayEntry(day, extraDayColumnTitles, morningMessagesForPlayer?.[dayIndex], filesIndex)
    ),
  };

  const extra = player.playerData.extraColumns ?? [];
  for (let i = 0; i < extraUserColumnTitles.length; i++) {
    base[extraUserColumnTitles[i]] = effectiveCellText(extra[i] ?? '', filesIndex);
  }

  return base;
};

export const SCRIPT_GLOBAL_NAMES = [
  'players',
  'roles',
  'currentPlayer',
  'currentDay',
  'dayDates',
  'schedule',
  'profiles',
  'Inputs',
  'InputsWithData',
] as const;

export const createScriptGlobals = (source: ScriptSourceData = {}): Record<string, unknown> => {
  const capability = source.capability ?? 'newser';
  const players = (source.players ?? []).map((entry) =>
    playerEntry(
      entry,
      source.userTableTitle,
      source.morningMessagesList?.[entry.email.toLowerCase()],
      source.filesIndex
    )
  );
  const currentPlayer = players.find((entry) => {
    const e = entry as Record<string, unknown>;
    // Email is the unique per-row identifier, check it first. Multiple rows
    // can share a userId (e.g. players who haven't signed in, or the operator
    // appearing as several table entries), so a userId match alone can resolve
    // to the wrong player.
    if (
      source.currentEmail &&
      typeof e.email === 'string' &&
      e.email.toLowerCase() === source.currentEmail.toLowerCase()
    ) {
      return true;
    }
    return Boolean(source.currentUserId && e.userId === source.currentUserId);
  });
  // aboutRole may be a display-composition cell; scripts that embed it see
  // the resolved document, not File()/Folder() source. Legacy raw markdown
  // and missing indexes pass through untouched.
  const resolveAbout = (aboutRole: string | undefined): string | undefined =>
    aboutRole && source.filesIndex
      ? flattenCellContent(
          foldCellForResolve(aboutRole, source.filesIndex, { displayModules: true }),
          source.filesIndex,
          { displayModules: true }
        ).markdown
      : aboutRole;
  const roles = (source.roles ?? [])
    .filter((role) => role.isVisible !== false || capability === 'operator')
    .map(({ role, doesRoleVote, isVisible, aboutRole }) => ({
      role,
      doesRoleVote,
      isVisible,
      aboutRole: resolveAbout(aboutRole),
    }));

  return {
    players,
    roles,
    currentPlayer: capability === 'player' ? currentPlayer : undefined,
    currentDay: source.currentDay ?? 0,
    dayDates: (source.dayDates ?? []).map((stored) => {
      const date = parseGameDayDate(stored);
      return isInstantGameDay(date) ? date.toISOString() : stored;
    }),
    schedule: source.schedule ?? {},
    profiles: source.profiles ?? [],
  };
};
