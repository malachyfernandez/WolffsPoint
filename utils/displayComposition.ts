import { printStatement } from '../script/lang/printer';
import {
  expandScriptIncludes,
  parseDisplayComposition,
  type FlattenIssue,
  type ScriptFilesIndex,
} from './scriptFiles';

export { parseDisplayComposition };

export const resolveDisplayComposition = (
  source: string,
  index: ScriptFilesIndex
): { markdown: string; issues: FlattenIssue[] } => {
  const parsed = parseDisplayComposition(source);
  if (!parsed) return { markdown: '', issues: [{ message: 'Invalid display composition' }] };
  if (!parsed.length) return { markdown: '', issues: [] };
  const expanded = expandScriptIncludes(parsed, index);
  return {
    markdown: `/*script\n${expanded.statements.map((statement) => printStatement(statement)).join('\n\n')}\nscript*/`,
    issues: expanded.issues,
  };
};

export const displayModuleCapabilities = (version: number | undefined) => ({
  migrated: (version ?? 0) >= 1,
  displayModules: (version ?? 0) >= 2,
});
