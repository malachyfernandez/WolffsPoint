import { nowMs } from './simNow';
import {
  buildFilesIndex,
  createMarkdownFileSource,
  createTagFileSource,
  docWithFile,
  docWithFolder,
  emptyScriptFilesDoc,
  fileInputDefaults,
  folderOfPath,
  getFileCallParts,
  joinFilePath,
  makeFileId,
  makeFileStatement,
  normalizeFilePath,
  parseDisplayComposition,
  parseFileCell,
  resolveFileRef,
  getTagMeta,
  isTagFile,
  tagFileTriggerSource,
  TAGS_FOLDER,
  type ScriptFile,
  type ScriptFilesDoc,
} from './scriptFiles';
import { getFolderCallParts, makeFolderStatement } from './scriptFolders';
import { ABOUT_ROLE_FOLDER } from './scriptFolderIdentity';
import { printScript } from '../script/lang/printer';
import { emptySpan, type Expression, type Statement } from '../script/lang/ast';
import type { RoleTableItem } from '../types/roleTable';
import type { UserTableItem, UserTableTitle } from '../types/playerTable';
import type { RuleBookData } from '../types/ruleBook';
import {
  displayCellEditorText,
  fileCellEditorText,
  parseCellPieces,
} from './cellPieces';

/**
 * Bulk "migrate everything" for a game copy. Pure: takes the game's records
 * and returns the migrated versions plus stats. The caller writes the results
 * into the destination game's records.
 *
 * What migrates:
 * - legacy tagDefinitions + tagTriggers -> `tags/` script files (meta +
 *   trigger body), matching the TagCellEditor one-shot migration.
 * - legacy markdown message cells -> a markdown file + a `File(...)` cell:
 *   roleTable roleMessage/voteMessage, voteMessageDefault, and every
 *   morningMessagesList entry.
 *
 * Cells already in file mode and file-backed tags pass through untouched.
 */

interface LegacyTagDefLike {
  name: string;
  color?: string;
  tagId?: string;
}

export interface LegacyMigrationInput {
  scriptFilesDoc: ScriptFilesDoc | undefined;
  tagDefinitions: LegacyTagDefLike[] | undefined;
  tagTriggers: Record<string, string> | undefined;
  roleTable: RoleTableItem[] | undefined;
  voteMessageDefault: string | undefined;
  morningMessagesList: Record<string, string[]> | undefined;
  /** For naming morning-message files after players. */
  userTable: UserTableItem[] | undefined;
  userTableTitle?: UserTableTitle;
  /** Legacy rulebook snapshot; modularContent is preserved when already valid. */
  ruleBook?: RuleBookData;
}

export interface MigrationStats {
  filesCreated: number;
  cellsConverted: number;
  tagsConverted: number;
  skipped: string[];
}

export interface LegacyMigrationOutput {
  scriptFilesDoc: ScriptFilesDoc;
  tagDefinitions: LegacyTagDefLike[];
  tagTriggers: Record<string, string>;
  roleTable: RoleTableItem[];
  voteMessageDefault: string;
  morningMessagesList: Record<string, string[]>;
  userTable: UserTableItem[];
  /** `content`/`roleOrder` remain the legacy snapshot; v2 reads modularContent. */
  ruleBook: RuleBookData;
  stats: MigrationStats;
}

/** A safety copy owns its certification scope; receipts still refer to the same stable targets. */
export const rebaseCopiedCertificationSources = <T>(
  value: T,
  fromGame: string,
  toGame: string
): T => {
  const before = `certification:${encodeURIComponent(`live:${fromGame}`)}:`;
  const after = `certification:${encodeURIComponent(`live:${toGame}`)}:`;
  const visit = (entry: unknown): unknown => {
    if (typeof entry === 'string') return entry.split(before).join(after);
    if (Array.isArray(entry)) return entry.map(visit);
    if (entry && typeof entry === 'object')
      return Object.fromEntries(Object.entries(entry).map(([key, item]) => [key, visit(item)]));
    return entry;
  };
  return visit(value) as T;
};

const fileCellText = (file: ScriptFile): string =>
  printScript({
    kind: 'Script',
    statements: [makeFileStatement(file)],
    diagnostics: [],
    span: emptySpan(),
  });

/** True when the text is already a file-mode cell (or empty). */
const isMigratedCell = (text: string | undefined): boolean => {
  const parsed = parseFileCell(text ?? '');
  return parsed !== null;
};

export const migrateLegacyContent = (input: LegacyMigrationInput): LegacyMigrationOutput => {
  const stats: MigrationStats = {
    filesCreated: 0,
    cellsConverted: 0,
    tagsConverted: 0,
    skipped: [],
  };
  let doc: ScriptFilesDoc = input.scriptFilesDoc ?? emptyScriptFilesDoc();
  const usedPaths = new Set(Object.values(doc.files ?? {}).map((f) => f.path.toLowerCase()));

  const uniquePath = (folder: string, baseName: string): string | null => {
    const clean = baseName.trim().replace(/[/\\]/g, '-');
    if (!clean) return null;
    let candidate = joinFilePath(folder, clean);
    let n = 2;
    while (usedPaths.has(candidate.toLowerCase())) {
      candidate = joinFilePath(folder, `${clean} ${n}`);
      n += 1;
    }
    usedPaths.add(candidate.toLowerCase());
    return candidate;
  };

  /** Creates a markdown file holding `content` and returns the new file. */
  const markdownFile = (
    folder: string,
    baseName: string,
    content: string
  ): ScriptFile | null => {
    const path = uniquePath(folder, baseName);
    if (!path) {
      stats.skipped.push(`${folder}/${baseName}`);
      return null;
    }
    const file: ScriptFile = {
      id: makeFileId(),
      path,
      kind: 'markdown',
      source: createMarkdownFileSource(content),
      updatedAt: nowMs(),
    };
    doc = docWithFolder(docWithFile(doc, file), folder);
    stats.filesCreated += 1;
    return file;
  };

  const scriptFile = (folder: string, baseName: string, source: string): ScriptFile | null => {
    const path = uniquePath(folder, baseName);
    if (!path) {
      stats.skipped.push(`${folder}/${baseName}`);
      return null;
    }
    const file: ScriptFile = {
      id: makeFileId(),
      path,
      kind: 'script',
      source,
      updatedAt: nowMs(),
    };
    doc = docWithFolder(docWithFile(doc, file), folder);
    stats.filesCreated += 1;
    return file;
  };

  const cellToFile = (folder: string, baseName: string, content: string): string | null => {
    const file = markdownFile(folder, baseName, content);
    if (!file) return null;
    stats.cellsConverted += 1;
    return fileCellText(file);
  };

  const migrateCell = (folder: string, name: string, raw: string): string => {
    const { base, pieces } = parseCellPieces(raw);
    // A provenance stream already uses the modular system. Rewriting its
    // historical values would invalidate removal matchers and source rollback.
    if (pieces.length || !base.trim() || isMigratedCell(base)) return raw;
    return cellToFile(folder, name, base) ?? raw;
  };

  // --- legacy tag definitions -> tags/ files -------------------------------
  const tagTriggers = input.tagTriggers ?? {};
  const remainingDefs: LegacyTagDefLike[] = [];
  const remainingTriggers = { ...tagTriggers };
  const existingTagFiles = new Map(
    Object.values(doc.files ?? {})
      .filter(isTagFile)
      .map((file) => [getTagMeta(file)?.name.toLowerCase(), file])
  );
  const definitions = [...(input.tagDefinitions ?? [])];
  for (const name of Object.keys(tagTriggers)) {
    if (!definitions.some((def) => def.name.toLowerCase() === name.toLowerCase()))
      definitions.push({ name });
  }
  for (const def of definitions) {
    const triggerKey = Object.keys(tagTriggers).find(
      (name) => name.toLowerCase() === def.name.toLowerCase()
    );
    const trigger = triggerKey ? tagTriggers[triggerKey] : '';
    const byId = def.tagId ? doc.files[def.tagId] : undefined;
    const existing = byId && isTagFile(byId) ? byId : existingTagFiles.get(def.name.toLowerCase());
    if (existing) {
      const body = tagFileTriggerSource(existing);
      if (trigger.trim() && body.trim() && trigger.trim() !== body.trim()) {
        stats.skipped.push(`Conflicting legacy and file triggers for "${def.name}"`);
        remainingDefs.push(def);
        continue;
      }
      if (trigger.trim() && !body.trim()) {
        const meta = getTagMeta(existing);
        doc = docWithFile(doc, {
          ...existing,
          source: createTagFileSource(
            meta?.name ?? def.name,
            meta?.color ?? def.color ?? 'Grey',
            trigger
          ),
          updatedAt: nowMs(),
        });
      }
      if (triggerKey) delete remainingTriggers[triggerKey];
      continue;
    }
    const path = uniquePath(TAGS_FOLDER, def.name);
    if (!path) {
      stats.skipped.push(`tags/${def.name}`);
      remainingDefs.push(def);
      continue;
    }
    const file: ScriptFile = {
      id: makeFileId(),
      path,
      kind: 'script',
      role: 'trigger',
      source: createTagFileSource(def.name, def.color ?? 'Grey', trigger),
      updatedAt: nowMs(),
    };
    doc = docWithFolder(docWithFile(doc, file), TAGS_FOLDER);
    existingTagFiles.set(def.name.toLowerCase(), file);
    if (triggerKey) delete remainingTriggers[triggerKey];
    stats.filesCreated += 1;
    stats.tagsConverted += 1;
  }

  // --- message cells --------------------------------------------------------
  const roleTable = (input.roleTable ?? []).map((role) => {
    const next = { ...role };
    if (next.roleMessage?.trim())
      next.roleMessage = migrateCell('roleMessage', next.role, next.roleMessage);
    if (next.voteMessage?.trim())
      next.voteMessage = migrateCell('voteMessage', next.role, next.voteMessage);
    return next;
  });

  // --- About Role -> aboutRole/ files ----------------------------------------
  const inAboutRoleFolder = (file: ScriptFile): boolean => {
    const folder = folderOfPath(normalizeFilePath(file.path)).toLowerCase();
    const root = ABOUT_ROLE_FOLDER.toLowerCase();
    return folder === root || folder.startsWith(`${root}/`);
  };

  const preexistingAboutIds = new Set(
    Object.values(doc.files).filter(inAboutRoleFolder).map((file) => file.id)
  );

  const visibleAboutStatements = (raw: string): Statement[] => {
    const index = buildFilesIndex(doc);
    const display = parseDisplayComposition(displayCellEditorText(raw, index));
    if (display?.length) return display;
    return parseFileCell(fileCellEditorText(raw, index)) ?? [];
  };

  interface AboutEntry {
    roleIndex: number;
    statements: Statement[];
    directFileId?: string;
  }

  const aboutEntries: AboutEntry[] = roleTable.flatMap((role, roleIndex) => {
    const raw = role.aboutRole;
    if (!raw?.trim()) return [];
    const { base, pieces } = parseCellPieces(raw);
    if (
      !pieces.length &&
      !isMigratedCell(base) &&
      parseDisplayComposition(base) === null &&
      base.trim()
    ) {
      const file = markdownFile(ABOUT_ROLE_FOLDER, role.role, base);
      if (!file) return [];
      role.aboutRole = fileCellText(file);
      stats.cellsConverted += 1;
      return [{ roleIndex, statements: [makeFileStatement(file, fileInputDefaults(file))], directFileId: file.id }];
    }
    const statements = visibleAboutStatements(raw);
    if (!statements.length) return [];
    const first = statements.length === 1 ? getFileCallParts(statements[0]) : null;
    const file = first ? resolveFileRef(buildFilesIndex(doc), first) : undefined;
    return [
      {
        roleIndex,
        statements,
        ...(file && inAboutRoleFolder(file) ? { directFileId: file.id } : {}),
      },
    ];
  });

  const directUses = new Map<string, number>();
  for (const entry of aboutEntries) {
    if (entry.directFileId) directUses.set(entry.directFileId, (directUses.get(entry.directFileId) ?? 0) + 1);
  }

  const aboutItemByRole = new Map<number, string>();
  for (const entry of aboutEntries) {
    let fileId = entry.directFileId;
    if (!fileId || (directUses.get(fileId) ?? 0) > 1) {
      const wrapper = scriptFile(
        ABOUT_ROLE_FOLDER,
        roleTable[entry.roleIndex]?.role ?? 'Role description',
        printScript({
          kind: 'Script',
          statements: entry.statements,
          diagnostics: [],
          span: emptySpan(),
        })
      );
      if (!wrapper) continue;
      fileId = wrapper.id;
    }
    aboutItemByRole.set(entry.roleIndex, fileId);
  }

  const inputRuleBook: RuleBookData = input.ruleBook ?? { content: '', roleOrder: [] };
  const orderedRoleIndexes = [
    ...new Set([
      ...(inputRuleBook.roleOrder ?? []),
      ...roleTable.map((_role, index) => index),
    ]),
  ].filter((index) => index >= 0 && index < roleTable.length && aboutItemByRole.has(index));

  const aboutOrder = orderedRoleIndexes.map((index) => aboutItemByRole.get(index)!);
  const mappedAboutIds = new Set(aboutItemByRole.values());
  const aboutHidden = new Set(
    orderedRoleIndexes
      .filter((index) => {
        const role = roleTable[index];
        return role?.hiddenFromRulebook === true || role?.isVisible === false;
      })
      .map((index) => aboutItemByRole.get(index)!)
  );
  // An unrelated preexisting member must not become visible just because the
  // destination now has an explicit folder block.
  for (const id of preexistingAboutIds) {
    if (!mappedAboutIds.has(id)) aboutHidden.add(id);
  }

  const containsAboutFolder = (statements: Statement[]): boolean => {
    const isAbout = (statement: Statement): boolean => {
      const parts = getFolderCallParts(statement);
      if (!parts) return false;
      return (
        parts.id === 'folder_about_role' ||
        normalizeFilePath(parts.path ?? '').toLowerCase() === ABOUT_ROLE_FOLDER.toLowerCase()
      );
    };
    return statements.some((statement) => {
      if (isAbout(statement)) return true;
      if (statement.kind === 'NavButtonStatement' || statement.kind === 'DisplayGroupStatement') {
        return containsAboutFolder(statement.body.statements);
      }
      return false;
    });
  };

  const navButton = (label: string, body: Statement[]): Statement => {
    const span = emptySpan();
    return {
      kind: 'NavButtonStatement',
      label: { kind: 'StringLiteral', value: label, span } as Expression,
      body: { kind: 'BlockStatement', statements: body, span },
      span,
    };
  };

  const ruleStatements = ((): Statement[] => {
    if (inputRuleBook.modularContent !== undefined) {
      const parsed = parseDisplayComposition(inputRuleBook.modularContent);
      if (!parsed) stats.skipped.push('rulebook modularContent');
      return parsed ?? [];
    }
    const existing = parseDisplayComposition(inputRuleBook.content ?? '');
    if (existing) return existing;
    const content = inputRuleBook.content ?? '';
    if (!content.trim()) return [];
    const rules = markdownFile('ruleBook', 'Rules', content);
    return rules ? [makeFileStatement(rules, fileInputDefaults(rules))] : [];
  })();

  const modularStatements =
    inputRuleBook.modularContent !== undefined || containsAboutFolder(ruleStatements)
      ? ruleStatements
      : [
          ...ruleStatements,
          navButton(inputRuleBook.roleDescriptionsTitle || 'Role Descriptions', [
            makeFolderStatement(
              { path: ABOUT_ROLE_FOLDER, id: 'folder_about_role' },
              {
                order: aboutOrder,
                hidden: [...aboutHidden],
                dividers: true,
                align: 'center',
                imageHeight: 30,
              }
            ),
          ]),
        ];
  const ruleBook: RuleBookData = {
    ...inputRuleBook,
    modularContent: printScript({
      kind: 'Script',
      statements: modularStatements,
      diagnostics: [],
      span: emptySpan(),
    }),
  };

  let voteMessageDefault = input.voteMessageDefault ?? '';
  if (voteMessageDefault.trim())
    voteMessageDefault = migrateCell('voteMessage', 'Default vote message', voteMessageDefault);

  const playerNameFor = (email: string) =>
    input.userTable?.find((p) => p.email.trim().toLowerCase() === email)?.realName ?? email;

  const morningMessagesList: Record<string, string[]> = {};
  for (const [email, messages] of Object.entries(input.morningMessagesList ?? {})) {
    const next = [...messages];
    for (let i = 0; i < next.length; i++) {
      const text = next[i];
      if (!text?.trim()) continue;
      next[i] = migrateCell('morningMessage', `${playerNameFor(email)} Day ${i + 1}`, text);
    }
    morningMessagesList[email] = next;
  }

  const userTable = (input.userTable ?? []).map((user) => ({
    ...user,
    playerData: {
      ...user.playerData,
      extraColumns: user.playerData.extraColumns?.map((raw, index) =>
        input.userTableTitle?.extraUserColumnTypes?.[index] === 'files'
          ? migrateCell(
              'columns',
              `${user.realName} ${input.userTableTitle.extraUserColumns[index]}`,
              raw
            )
          : raw
      ),
    },
    days: user.days.map((day, dayIndex) => ({
      ...day,
      extraColumns: day.extraColumns?.map((raw, index) =>
        input.userTableTitle?.extraDayColumnTypes?.[index] === 'files'
          ? migrateCell(
              'columns',
              `${user.realName} Day ${dayIndex + 1} ${input.userTableTitle.extraDayColumns[index]}`,
              raw
            )
          : raw
      ),
    })),
  }));

  return {
    scriptFilesDoc: doc,
    tagDefinitions: remainingDefs,
    tagTriggers: remainingTriggers,
    roleTable,
    voteMessageDefault,
    morningMessagesList,
    userTable,
    ruleBook,
    stats,
  };
};
