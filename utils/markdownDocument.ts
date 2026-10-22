import { parseMarkdown, type MarkdownBlock } from './parseMarkdown';
import { expandFileMarkersInText } from './scriptFiles';
import { interpretScript, type RenderInstruction, type RuntimeIssue } from '../script/runtime/interpreter';
import { createScriptGlobals, type ScriptSourceData } from '../script/runtime/sources';
import { decodeStoredInputState } from '../script/runtime/values';

export interface DocumentPresentation {
  align?: 'left' | 'center' | 'justify';
  imageHeight?: number;
}

interface DocumentNodeBase {
  id: string;
  presentation: DocumentPresentation;
}

export type MarkdownDocumentNode =
  | (DocumentNodeBase & { kind: 'markdown'; block: Exclude<MarkdownBlock, { type: 'script' }>; blockIndex: number })
  | (DocumentNodeBase & { kind: 'control'; instruction: RenderInstruction })
  | (DocumentNodeBase & { kind: 'navigation'; label: string; children: MarkdownDocumentNode[] });

export interface MarkdownDocument {
  nodes: MarkdownDocumentNode[];
  issues: RuntimeIssue[];
  inputKeys: Set<string>;
}

/** Evaluate the whole document, not only the mounted navigation screen. */
export const evaluateMarkdownDocument = (
  markdown: string,
  sources?: ScriptSourceData,
  state?: Record<string, string | undefined>
): MarkdownDocument => {
  const issues: RuntimeIssue[] = [];
  const inputKeys = new Set<string>();
  const inputState = decodeStoredInputState(state);
  const globals = { ...createScriptGlobals(sources), Inputs: inputState };
  const budget = { nodes: 10_000, fuel: 100_000, characters: 1_000_000 };
  let limited = false;
  const spend = (depth: number, characters = 0): boolean => {
    budget.characters -= characters;
    if (depth < 32 && budget.nodes-- > 0 && budget.fuel > 0 && budget.characters >= 0) return true;
    if (!limited) issues.push({ message: 'Document rendering limit exceeded' });
    limited = true;
    return false;
  };
  const inlineInputs = (block: MarkdownBlock) => {
    const text = 'text' in block ? block.text : block.type === 'list' ? block.items.join('\n') : '';
    for (const match of text.matchAll(/\/\[([\s\S]*?)\]\//g)) {
      const body = match[1].trim();
      const label = body.match(/^"([^"]+)"\s*:/)?.[1]?.trim() || body;
      if (label) inputKeys.add(label);
    }
  };
  const instructions = (
    values: RenderInstruction[],
    prefix: string,
    presentation: DocumentPresentation,
    depth: number
  ): MarkdownDocumentNode[] => values.flatMap((instruction, index): MarkdownDocumentNode[] => {
    if (!spend(depth)) return [];
    const id = `${prefix}/i${index}:${instruction.key}`;
    if (instruction.kind === 'markdown') {
      return document(instruction.markdown ?? '', id, presentation, depth + 1);
    }
    if (instruction.kind === 'group') {
      const align = instruction.props.align;
      const imageHeight = instruction.props.imageheight;
      return instructions(instruction.children ?? [], id, {
        ...presentation,
        ...(['left', 'center', 'justify'].includes(String(align)) ? { align: align as DocumentPresentation['align'] } : {}),
        ...(typeof imageHeight === 'number' ? { imageHeight } : {}),
      }, depth + 1);
    }
    if (instruction.kind === 'navigation') {
      return [{
        kind: 'navigation', id, presentation, label: instruction.label || 'Continue',
        children: instructions(instruction.children ?? [], id, presentation, depth + 1),
      }];
    }
    if (instruction.kind !== 'divider') inputKeys.add(instruction.key);
    return [{ kind: 'control', id, presentation, instruction }];
  });
  const document = (
    source: string,
    prefix: string,
    presentation: DocumentPresentation,
    depth: number
  ): MarkdownDocumentNode[] => {
    if (!spend(depth, source.length)) return [];
    const resolved = sources?.filesIndex ? expandFileMarkersInText(source, sources.filesIndex) : source;
    return parseMarkdown(resolved).flatMap((block, blockIndex): MarkdownDocumentNode[] => {
      if (!spend(depth)) return [];
      const id = `${prefix}/b${blockIndex}`;
      if (block.type !== 'script') {
        inlineInputs(block);
        return [{ kind: 'markdown', id, presentation, block, blockIndex }];
      }
      const result = interpretScript(block.source, {
        globals, inputState, filesIndex: sources?.filesIndex, fuel: budget.fuel,
      });
      budget.fuel = result.fuelRemaining;
      issues.push(...result.issues);
      return instructions(result.output, id, presentation, depth + 1);
    });
  };
  return { nodes: document(markdown, 'root', {}, 0), issues, inputKeys };
};

export const documentScreenAtPath = (
  root: MarkdownDocumentNode[],
  path: string[]
): { nodes: MarkdownDocumentNode[]; path: string[]; title?: string } => {
  let nodes = root;
  const validPath: string[] = [];
  let title: string | undefined;
  for (const id of path) {
    const node = nodes.find((entry) => entry.kind === 'navigation' && entry.id === id);
    if (!node || node.kind !== 'navigation') break;
    validPath.push(id);
    title = node.label;
    nodes = node.children;
  }
  return { nodes, path: validPath, title };
};
