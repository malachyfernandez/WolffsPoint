import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTooltip } from '../../../script/editor/useTooltip';
import { Modal, Platform, Pressable, TextInput, useWindowDimensions, View } from 'react-native';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCopy,
  ClipboardPaste,
  Code2,
  Columns3,
  Copy,
  Ellipsis,
  Eye,
  FileText,
  Folder,
  FolderDown,
  FolderInput,
  FolderPlus,
  FolderUp,
  List,
  MousePointer,
  MousePointerClick,
  Pencil,
  Plus,
  Search,
  SquareArrowOutUpRight,
  Tag,
  Trash2,
  TriangleAlert,
  X,
  Zap,
} from 'lucide-react-native';
import ConvexDialog from '../../ui/dialog/ConvexDialog';
import DialogHeader from '../../ui/dialog/DialogHeader';
import CloseButton from '../../ui/dialog/CloseButton';
import ConfirmDialog from '../../ui/dialog/ConfirmDialog';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import AppButton from '../../ui/buttons/AppButton';
import FontText from '../../ui/text/FontText';
import FontTextInput from '../../ui/forms/FontTextInput';
import ShadowScrollView from '../../ui/ShadowScrollView';
import LoadingContainer from '../../ui/loading/LoadingContainer';
import {
  createTagFileSource,
  fileName,
  folderOfPath,
  isProtectedFolder,
  isTagFile,
  isValidFileName,
  joinFilePath,
  TAGS_FOLDER,
  tagFileName,
  type FilePlacement,
  type FilePlacements,
  type ScriptFile,
  type ScriptFileKind,
  type ScriptFileRole,
} from '../../../utils/scriptFiles';
import {
  DEAD_CHAIN_COLOR,
  FilePlacementChip,
  FilePlacementsModal,
  MorePlacementsChip,
  type DeadEnd,
} from './PlacementChips';
import AddTagDialog from '../AddTagDialog';
import UsedByIcon from '../../icons/UsedByIcon';
import MoveToDialog from './MoveToDialog';
import ContextMenuArea from '../../ui/contextMenu/ContextMenuArea';
import DragArea, { type DragPointerInfo } from '../../ui/drag/DragArea';
import { hideCursorFollower, showCursorFollower, useCursorFollower } from '../../ui/cursorFollower';
import { WebDropdownPortal } from '../../../contexts/WebDropdownProvider';
import { useValue } from '../../../hooks/useData';
import { useToast } from '../../../contexts/ToastContext';
import {
  downloadFolderZip,
  pickFolderZipFile,
  readFolderZip,
} from '../../../utils/scriptFolderZip';
import { useContentWidth } from '../../../hooks/useContentWidth';
import { useKeyboardShortcuts } from '../../../hooks/useKeyboardShortcuts';
import type { useScriptFiles } from '../../../hooks/useScriptFiles';

type FilesApi = ReturnType<typeof useScriptFiles>;

/** One row in the right-click context menu, a divider, or a small section
 *  header (the options menu groups its rows under labeled sections). */
type CtxMenuItem =
  | {
      icon: React.ReactNode;
      label: string;
      onPress: () => void;
      danger?: boolean;
      /** Renders a trailing check - radio/checkbox marker for pref rows. */
      checked?: boolean;
    }
  | { divider: true }
  | { header: string };

/** Owner id for the file-browser's drag ghost on the shared cursor follower. */
const FB_DRAG_ID = 'file-browser-drag';

/** Icon-only button with the shared hover tooltip, same system as blocks. */
const IconTipButton = ({
  icon,
  onPress,
  label,
  size = 'h-8 w-8',
}: {
  icon: React.ReactNode;
  onPress: () => void;
  label: string;
  size?: string;
}) => {
  const tooltipId = useId();
  const { setHovered } = useTooltip(tooltipId, label);
  return (
    <Pressable
      accessibilityLabel={label}
      onPress={(e) => {
        e.stopPropagation?.();
        onPress();
      }}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      className={`hover:bg-text/10 items-center justify-center rounded-lg ${size}`}>
      {icon}
    </Pressable>
  );
};

/** Per-role file icon: tag files → tag glyph, trigger-role scripts → bolt,
 *  markdown → file, display scripts → code. `active` lightens the colors so
 *  they stay readable on the dark selected-row background. */
const fileIcon = (file: ScriptFile, size: number, active = false) =>
  isTagFile(file) ? (
    <Tag size={size} color={active ? '#d4a9f2' : '#7E22CE'} />
  ) : file.role === 'trigger' ? (
    <Zap size={size} color={active ? '#f2b95e' : '#B45309'} />
  ) : file.kind === 'markdown' ? (
    <FileText size={size} color={active ? '#a8c8e0' : '#4a6a8a'} />
  ) : (
    <Code2 size={size} color={active ? '#c9aef0' : '#6a4a8a'} />
  );

/** Display label: tag files show their tag name, others the file name. */
const fileLabel = (file: ScriptFile) => (isTagFile(file) ? tagFileName(file) : fileName(file.path));

/** One segment of the macOS-style list/columns view toggle. */
const ViewToggleButton = ({
  icon,
  onPress,
  label,
  active,
  first,
}: {
  icon: React.ReactNode;
  /** Receives the PressEvent so menus can anchor to the button's bounds. */
  onPress: (e?: unknown) => void;
  label: string;
  active: boolean;
  first: boolean;
}) => {
  const tooltipId = useId();
  const { setHovered } = useTooltip(tooltipId, label);
  return (
    <Pressable
      accessibilityLabel={label}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      className={`h-7 w-9 items-center justify-center ${
        active ? 'bg-text/20' : 'hover:bg-text/5'
      } ${first ? '' : 'border-subtle-border border-l'}`}>
      {icon}
    </Pressable>
  );
};

/** Secondary line on the fixed-width pick "Choose" button: long names fade
 *  off the right edge via a mask instead of resizing the button or "…".
 *  The mask only applies once the label actually overflows (scrollWidth >
 *  clientWidth), short labels render fully opaque. Native ignores the mask
 *  and falls back to a clipped single line. */
/** One-line diagnostics summary shared by file rows in both views and the
 *  column-view preview panel. `inverted` = the row sits on the dark active
 *  selection background. */
const ISSUE_COLOR = '#a03030';
const ISSUE_COLOR_INVERTED = '#ff9a8a';
const WARN_COLOR_INVERTED = '#ffd34d';
const FileIssueLine = ({ issues, inverted = false }: { issues: string[]; inverted?: boolean }) => {
  const color = inverted ? ISSUE_COLOR_INVERTED : ISSUE_COLOR;
  return (
    <Row className="items-center gap-1">
      <TriangleAlert size={11} color={color} />
      <FontText className="min-w-0 flex-1 text-xs" style={{ color }} numberOfLines={1}>
        {issues[0]}
        {issues.length > 1 ? ` (+${issues.length - 1} more)` : ''}
      </FontText>
    </Row>
  );
};

/** Yellow sibling of FileIssueLine for the "not used anywhere" state: a file
 *  with zero placements - no cell and no other file references it. */
const FileWarnLine = ({ text, inverted = false }: { text: string; inverted?: boolean }) => (
  <Row className="items-center gap-1">
    <TriangleAlert size={11} color={inverted ? WARN_COLOR_INVERTED : DEAD_CHAIN_COLOR} />
    <FontText
      className="min-w-0 flex-1 text-xs"
      style={{ color: inverted ? WARN_COLOR_INVERTED : DEAD_CHAIN_COLOR }}
      numberOfLines={1}>
      {text}
    </FontText>
  </Row>
);

/** Label for a file with zero placements. Trigger scripts are consumed by
 *  tags, so their live chain ends at a tag rather than a cell. */
const unusedLabel = (file: ScriptFile) =>
  file.role === 'trigger' && !isTagFile(file)
    ? 'not used in files or tags'
    : 'not used in files or cells';

const PICK_LABEL_FADE = 'linear-gradient(to right, #000 70%, transparent 100%)';
const PickSubtext = ({ icon, text }: { icon: React.ReactNode; text: string }) => {
  const rowRef = useRef<View>(null);
  const [needsFade, setNeedsFade] = useState(false);
  useEffect(() => {
    const el = rowRef.current as unknown as HTMLElement | null;
    if (!el) return;
    const measure = () => setNeedsFade(el.scrollWidth > el.clientWidth + 1);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text]);
  return (
    <View
      ref={rowRef}
      className="max-w-full flex-row items-center"
      style={[
        { gap: 4, overflow: 'hidden' },
        needsFade
          ? ({ maskImage: PICK_LABEL_FADE, WebkitMaskImage: PICK_LABEL_FADE } as never)
          : null,
      ]}>
      {icon}
      <FontText
        variant="subtext"
        color="white"
        className="text-xs opacity-80"
        numberOfLines={1}
        ellipsizeMode="clip"
        style={{ flexShrink: 0 }}>
        {text}
      </FontText>
    </View>
  );
};

export interface FileBrowserContentProps {
  /** The files API from useScriptFiles; the parent owns the doc. */
  filesApi: FilesApi;
  /** Folder the browser opens into (usually the pinned folder for the cell). */
  defaultFolder?: string;
  /** Base for auto-suggested new-file names (row context: role/player name). */
  nameBase?: string;
  /**
   * 'pick'  : tapping a file selects it and closes (cell editor, insert).
   * 'manage': tapping a file opens it for editing via onOpenFile.
   */
  mode?: 'pick' | 'manage';
  /** Pick mode: called with the selected file. */
  onPick?: (file: ScriptFile) => void;
  /** Pick mode: called with the currently browsed folder. */
  onPickFolder?: (path: string) => void;
  /** Manage mode: open a file in the appropriate editor. New files created
   *  from the browser also come through here so the caller can open the
   *  editor straight away. */
  onOpenFile?: (file: ScriptFile) => void;
  /** Pick mode only: the Cancel row / post-pick close callback. */
  onCancel?: () => void;
  /** Usage graph: file rows show where they're referenced + orphan badges. */
  placements?: FilePlacements;
  /** fileId → problem messages: reference/lint errors including ones caused
   *  by edits to other files (deleted refs, dropped inputs, cycles). */
  diagnostics?: Map<string, string[]>;
  /** Placement chips navigate: files open the editor, cells jump tabs. */
  onNavigate?: (placement: FilePlacement) => void;
  /** Role for new script files created from this browser - 'trigger' when the
   *  pick/insert was requested from inside a trigger file (a display file
   *  include would just get flagged by the linter). */
  defaultFileRole?: ScriptFileRole;
  /** Pick mode: only files of these kinds are listed/selectable (e.g.
   *  ['script'] for cross-file move placement - markdown files can't hold
   *  blocks). Folders still show for navigation; creation entries for
   *  excluded kinds hide. */
  fileKinds?: ScriptFileKind[];
}

export interface FileBrowserDialogProps extends FileBrowserContentProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

interface NamePromptState {
  title: string;
  placeholder: string;
  initial: string;
  submitLabel: string;
  validate?: (name: string) => string | null;
  onSubmit: (name: string) => void;
}

interface MoveTarget {
  fileId?: string;
  folderPath?: string;
}

const PINNED_FOLDER_LABELS: Record<string, string> = {
  rolemessage: 'Role Messages',
  votemessage: 'Vote Messages',
  morningmessage: 'Morning Messages',
  aboutrole: 'About Roles',
  tags: 'Tags',
};

/** Display name for a folder path: friendly label for pinned roots. */
export const folderLabel = (folder: string) =>
  PINNED_FOLDER_LABELS[folder.toLowerCase()] ?? fileName(folder);

/**
 * The browser's actual UI: toolbar, breadcrumbs, listing, and the
 * name/move/delete prompts. Used by FileBrowserDialog (modal shell) and by
 * the Files tab (inline page body).
 */
export const FileBrowserContent = ({
  filesApi,
  defaultFolder,
  nameBase,
  mode = 'manage',
  onPick,
  onPickFolder,
  onOpenFile,
  onCancel,
  placements,
  diagnostics,
  onNavigate,
  defaultFileRole,
  fileKinds,
}: FileBrowserContentProps) => {
  const { showToast } = useToast();
  const [currentFolder, setCurrentFolder] = useState('');
  /** 'list' = current card list (with disclosure triangles); 'columns' =
   *  macOS column view. Persisted per user so the choice survives reloads. */
  const [viewPref, setViewPref] = useValue<'list' | 'columns'>('scriptFiles:browserView', {
    defaultValue: 'list',
  });
  const viewMode = viewPref?.value ?? 'list';
  /** 'single': a plain click opens/enters the row right away. 'second': a
   *  plain click only selects, and clicking the already-selected row opens
   *  it - the Finder/Explorer norm, and the only mode where clicking can
   *  build a selection without modifier keys. */
  const [openClickPref, setOpenClickPref] = useValue<'single' | 'second'>(
    'scriptFiles:openOnClick',
    { defaultValue: 'second' }
  );
  const openOnSecondClick = (openClickPref?.value ?? 'second') === 'second';
  /** Columns view only: whether the right-hand "used in" preview column
   *  follows the selected file. */
  const [previewPref, setPreviewPref] = useValue<boolean>('scriptFiles:columnPreview', {
    defaultValue: true,
  });
  const showFilePreview = previewPref?.value ?? true;
  /** Toolbar search: a non-empty query swaps the tree/column listing for a
   *  flat result list. Scope persists - 'all' (everywhere) is the default,
   *  'folder' limits matches to the active folder's subtree. */
  const [searchText, setSearchText] = useState('');
  const [scopePref, setScopePref] = useValue<'all' | 'folder'>('scriptFiles:searchScope', {
    defaultValue: 'all',
  });
  const searchScope = scopePref?.value ?? 'all';
  const searchQuery = searchText.trim().toLowerCase();
  const searching = searchQuery.length > 0;
  const searchInputRef = useRef<TextInput | null>(null);
  /** List view: folders opened via their disclosure triangle (in-place). */
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  /** Columns view: the selected folder chain - column i+1 shows columnPath[i]. */
  const [columnPath, setColumnPath] = useState<string[]>([]);
  /** Columns view: a file picked in the deepest column. When set, the file is
   *  the active selection and every columnPath entry is a navigated ancestor;
   *  when null, the deepest chain folder is the active selection. */
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [namePrompt, setNamePrompt] = useState<NamePromptState | null>(null);
  /** 'New Tag' uses the shared tag dialog (name + color); the folder it was
   *  opened from is stashed here for the create call. */
  const [isNewTagOpen, setIsNewTagOpen] = useState(false);
  const newTagFolderRef = useRef(TAGS_FOLDER);
  const [nameDraft, setNameDraft] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [moveTarget, setMoveTarget] = useState<MoveTarget | null>(null);
  const [placementsFor, setPlacementsFor] = useState<ScriptFile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: 'file'; file: ScriptFile }
    | { kind: 'folder'; path: string; count: number }
    | { kind: 'multi'; keys: string[]; count: number }
    | null
  >(null);
  /** Right-click menu (web only): viewport position + the item list built
   *  for whatever was clicked - file row, folder row, or empty space.
   *  Also drives the ⋯ / + column-header menus (all platforms). */
  const [ctxMenu, setCtxMenu] = useState<{
    x: number;
    y: number;
    items: CtxMenuItem[];
  } | null>(null);
  /** Column-view header controls show on hover (web) or when the column
   *  holds the keyboard selection. Tracked by the column's folder path. */
  const [hoveredColKey, setHoveredColKey] = useState<string | null>(null);
  /** Window dims for clamping the context menu (web + native modal). */
  const winDims = useWindowDimensions();
  /* Only fold the trailing 4-button strip into a 2x2 square on genuinely
   *  phone-width game areas - below 420px the 1x4 strip would crush the
   *  name/placement column. Content width, not viewport, so the sim
   *  sidebar shrinking the game area triggers it too. */
  const compactRowActions = useContentWidth() < 420;
  /** Finder-style multi-selection, scoped to one parent folder. Keys are
   *  'f:<fileId>' / 'd:<folderPath>'; anchor is the shift-range pivot. */
  const [selection, setSelection] = useState<{
    parent: string;
    keys: Set<string>;
    anchor: string | null;
  }>({ parent: '', keys: new Set<string>(), anchor: null });
  /** Folder the cursor is over mid-drag (drop highlight); null = none. */
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  /** The press that ends a real drag must not fire the row's onPress (it'd
   *  open a file the user just dropped). Set on drop, consumed or cleared
   *  one tick later. */
  const suppressClickRef = useRef(false);
  /** Live drag session in a ref: pointermove stays cheap and doesn't
   *  re-render on every move - only the resolved drop target renders. */
  const dragRef = useRef<{
    key: string;
    parent: string;
    startX: number;
    startY: number;
    active: boolean;
    items: string[];
    target: string | null;
    cleanup: () => void;
  } | null>(null);
  /** App-internal clipboard (not the OS one): the copied/cut row keys.
   *  Cmd+V clones into the current folder, Cmd+Opt+V moves. */
  const clipboardRef = useRef<{ keys: string[]; cut: boolean } | null>(null);
  /** One-shot guard for the default-folder preselection below. */
  const seededDefaultSelectionRef = useRef(false);

  const { doc, index } = filesApi;

  /** Pick-mode kind restriction: files outside the set hide from every
   *  listing/search/count so they can't be picked as a destination. */
  const fileKindsSet = useMemo(() => (fileKinds ? new Set(fileKinds) : null), [fileKinds]);
  const kindAllowed = useCallback(
    (file: ScriptFile) => !fileKindsSet || fileKindsSet.has(file.kind),
    [fileKindsSet]
  );

  // Mounted callers own visibility: the dialog unmounts this content when
  // it closes (state resets), the page keeps it mounted (folder persists).
  useEffect(() => {
    setCurrentFolder(defaultFolder ?? '');
    // Seed the column chain so the column view opens inside the pinned folder.
    const chain: string[] = [];
    let acc = '';
    for (const segment of (defaultFolder ?? '').split('/').filter(Boolean)) {
      acc = acc ? `${acc}/${segment}` : segment;
      chain.push(acc);
    }
    setColumnPath(chain);
    setSelectedFileId(null);
    setSelection({ parent: '', keys: new Set<string>(), anchor: null });
    setExpandedFolders(new Set());
    setNamePrompt(null);
    setNameDraft('');
    setNameError(null);
    setMoveTarget(null);
    setDeleteTarget(null);
    setSearchText('');
    seededDefaultSelectionRef.current = false;
  }, [defaultFolder, mode]);

  /** parent folder → direct children (folders first). One map powers the
   *  flat list, expanded subtrees, and every column. */
  const childrenByParent = useMemo(() => {
    const map = new Map<string, { folders: string[]; files: ScriptFile[] }>();
    const ensure = (parent: string) => {
      let entry = map.get(parent);
      if (!entry) {
        entry = { folders: [], files: [] };
        map.set(parent, entry);
      }
      return entry;
    };
    for (const folder of index.folders) ensure(folderOfPath(folder)).folders.push(folder);
    for (const file of Object.values(doc.files))
      if (kindAllowed(file)) ensure(folderOfPath(file.path)).files.push(file);
    for (const entry of map.values()) {
      entry.folders.sort((a, b) => a.localeCompare(b));
      entry.files.sort((a, b) => fileName(a.path).localeCompare(fileName(b.path)));
    }
    return map;
  }, [index.folders, doc.files, kindAllowed]);

  /** Folder path -> total diagnostic problems in the files at or below it.
   *  Each flagged file adds its issue count to every ancestor folder, so
   *  problems bubble up the tree for both views. */
  const folderIssueCounts = useMemo(() => {
    const counts = new Map<string, number>();
    if (!diagnostics) return counts;
    for (const [fileId, issues] of diagnostics) {
      if (!issues.length) continue;
      const file = doc.files[fileId];
      if (!file) continue;
      let folder: string | null = folderOfPath(file.path);
      while (folder !== null) {
        counts.set(folder, (counts.get(folder) ?? 0) + issues.length);
        folder = folder === '' ? null : folderOfPath(folder);
      }
    }
    return counts;
  }, [diagnostics, doc.files]);

  /** Folder path -> files below it referenced by NOTHING (not a cell, not
   *  another file). Dead chains (file callers that never reach a cell) get a
   *  ⚠ on their chip but don't count here - only fully-unused files do. */
  const folderWarnCounts = useMemo(() => {
    const counts = new Map<string, number>();
    if (!placements) return counts;
    for (const file of Object.values(doc.files)) {
      if ((placements.byFile.get(file.id)?.length ?? 0) > 0) continue;
      let folder: string | null = folderOfPath(file.path);
      while (folder !== null) {
        counts.set(folder, (counts.get(folder) ?? 0) + 1);
        folder = folder === '' ? null : folderOfPath(folder);
      }
    }
    return counts;
  }, [placements, doc.files]);

  /** A file-caller placement is a dead chain when the calling file is itself
   *  unused (orphan): trigger callers must reach a tag, others a cell. */
  const deadEndFor = (p: FilePlacement): DeadEnd | undefined => {
    if (p.kind !== 'file' || !p.fileId || !placements?.orphans.has(p.fileId)) return undefined;
    const caller = index.byId.get(p.fileId);
    return caller && caller.role === 'trigger' && !isTagFile(caller) ? 'tag' : 'cell';
  };

  /** Folder that toolbar actions (New file/folder) target: the visible
   *  folder in list view, the deepest open column in column view. */
  const activeFolder =
    viewMode === 'columns' ? (columnPath[columnPath.length - 1] ?? '') : currentFolder;

  /** Flat results while searching: file name (or tag name for tag files)
   *  substring match. The 'folder' scope limits matches to the active
   *  folder's subtree; root scope and 'all' match every file. */
  const searchResults = useMemo(() => {
    if (!searching) return [];
    const matches = Object.values(doc.files).filter(
      (f) =>
        kindAllowed(f) &&
        (fileLabel(f).toLowerCase().includes(searchQuery) ||
          fileName(f.path).toLowerCase().includes(searchQuery))
    );
    const scoped =
      searchScope === 'folder' && activeFolder
        ? matches.filter((f) => f.path.toLowerCase().startsWith(`${activeFolder.toLowerCase()}/`))
        : matches;
    return scoped.sort((a, b) => fileLabel(a).localeCompare(fileLabel(b)));
  }, [searching, searchQuery, searchScope, activeFolder, doc.files, kindAllowed]);

  /** "in Role Messages/sub" line under a result's name so matches in 'all'
   *  scope still show where they live. */
  const searchPathHint = (file: ScriptFile) => {
    const dir = folderOfPath(file.path);
    if (!dir) return 'in Files';
    return `in ${dir.split('/').map(folderLabel).join('/')}`;
  };

  // Preselect the first row inside defaultFolder so a picker opened on a
  // pinned folder starts with a concrete selection (Enter/→ acts on it
  // right away). Retries until the folder's entry exists (the doc can still
  // be loading on mount); the reset effect above clears the guard.
  useEffect(() => {
    if (seededDefaultSelectionRef.current || !defaultFolder) return;
    const entry = childrenByParent.get(defaultFolder);
    if (!entry) return;
    seededDefaultSelectionRef.current = true;
    const firstFolder = entry.folders[0];
    const firstFile = entry.files[0];
    if (firstFolder) setColumnPath((prev) => [...prev, firstFolder]);
    else if (firstFile) setSelectedFileId(firstFile.id);
  }, [childrenByParent, defaultFolder]);

  const breadcrumbs = useMemo(() => {
    const crumbs: { label: string; path: string }[] = [{ label: 'Files', path: '' }];
    let acc = '';
    for (const segment of currentFolder.split('/').filter(Boolean)) {
      acc = acc ? `${acc}/${segment}` : segment;
      crumbs.push({ label: folderLabel(acc), path: acc });
    }
    return crumbs;
  }, [currentFolder]);

  const folderCountUnder = (folder: string) => {
    const lower = folder.toLowerCase();
    return Object.values(doc.files).filter(
      (f) => kindAllowed(f) && f.path.toLowerCase().startsWith(`${lower}/`)
    ).length;
  };

  // ------------------------------------------------------------- actions

  const openNewFilePrompt = (kind: 'markdown' | 'script', folder = activeFolder) => {
    const suggested = filesApi.suggestName(nameBase ?? 'New file', folder);
    setNameDraft(suggested);
    setNameError(null);
    setNamePrompt({
      title: kind === 'markdown' ? 'New markdown file' : 'New script file',
      placeholder: 'File name',
      initial: suggested,
      submitLabel: 'Create',
      validate: (name) => {
        if (!isValidFileName(name)) return 'Names can\'t contain / \\ : * ? " < > |';
        const path = joinFilePath(folder, name.trim());
        if (index.byPath.has(path.toLowerCase()))
          return 'A file with that name already exists here';
        return null;
      },
      onSubmit: (name) => {
        const file = filesApi.createFile(
          folder,
          name,
          kind,
          kind === 'script' ? defaultFileRole : undefined
        );
        if (file) onOpenFile?.(file);
      },
    });
  };

  /** New tag = the shared AddTagDialog (name + color + preview); creating
   *  writes a tag file under the folder and opens it right away - same flow
   *  as every other tag create path. */
  const openNewTagDialog = (folder: string) => {
    newTagFolderRef.current = folder;
    setIsNewTagOpen(true);
  };

  const openNewFolderPrompt = (parent: string = activeFolder) => {
    const folder = typeof parent === 'string' ? parent : activeFolder;
    setNameDraft('New folder');
    setNameError(null);
    setNamePrompt({
      title: 'New folder',
      placeholder: 'Folder name',
      initial: 'New folder',
      submitLabel: 'Create',
      validate: (name) => {
        if (!isValidFileName(name)) return 'Names can\'t contain / \\ : * ? " < > |';
        const path = joinFilePath(folder, name.trim());
        if (
          index.byPath.has(path.toLowerCase()) ||
          index.folders.some((f) => f.toLowerCase() === path.toLowerCase())
        ) {
          return 'Something with that name already exists here';
        }
        return null;
      },
      onSubmit: (name) => filesApi.createFolder(joinFilePath(folder, name.trim())),
    });
  };

  const openRenamePrompt = (file: ScriptFile) => {
    const current = fileName(file.path);
    setNameDraft(current);
    setNameError(null);
    setNamePrompt({
      title: 'Rename file',
      placeholder: 'File name',
      initial: current,
      submitLabel: 'Rename',
      validate: (name) => {
        if (!isValidFileName(name)) return 'Names can\'t contain / \\ : * ? " < > |';
        const path = joinFilePath(folderOfPath(file.path), name.trim());
        if (
          path.toLowerCase() !== file.path.toLowerCase() &&
          index.byPath.has(path.toLowerCase())
        ) {
          return 'A file with that name already exists here';
        }
        return null;
      },
      onSubmit: (name) => filesApi.renameFile(file.id, name),
    });
  };

  const openRenameFolderPrompt = (folder: string) => {
    const current = fileName(folder);
    setNameDraft(current);
    setNameError(null);
    setNamePrompt({
      title: 'Rename folder',
      placeholder: 'Folder name',
      initial: current,
      submitLabel: 'Rename',
      validate: (name) => {
        if (!isValidFileName(name)) return 'Names can\'t contain / \\ : * ? " < > |';
        const path = joinFilePath(folderOfPath(folder), name.trim());
        if (
          path.toLowerCase() !== folder.toLowerCase() &&
          (index.byPath.has(path.toLowerCase()) ||
            index.folders.some((f) => f.toLowerCase() === path.toLowerCase()))
        ) {
          return 'Something with that name already exists here';
        }
        return null;
      },
      onSubmit: (name) => filesApi.renameFolder(folder, name),
    });
  };

  const handleFileTap = (file: ScriptFile) => {
    if (mode === 'pick') {
      onPick?.(file);
      onCancel?.();
      return;
    }
    onOpenFile?.(file);
  };

  const submitNamePrompt = () => {
    if (!namePrompt) return;
    const name = nameDraft.trim();
    const error = namePrompt.validate?.(name) ?? (!name ? 'Name is required' : null);
    if (error) {
      setNameError(error);
      return;
    }
    const action = namePrompt.onSubmit;
    setNamePrompt(null);
    action(name);
  };

  // ------------------------------------------------- column-view selection

  /** DOM id stamped on the active row so it can be scrolled into view
   *  (react-native-web maps nativeID → id). Unique per mounted browser. */
  const activeRowDomId = `fb-col-active-${useId()}`;
  /** 0-width sentinel at the right end of the column rail; scrolled into
   *  view on selection changes so freshly opened columns reveal. */
  const endMarkerDomId = `fb-col-end-${useId()}`;
  /** Set by arrow-key navigation: the next scroll-into-view centers the row
   *  vertically. Mouse selection keeps the gentler `nearest` behavior. */
  const centerActiveRowRef = useRef(false);

  type ColumnItem = { kind: 'folder'; path: string } | { kind: 'file'; file: ScriptFile };

  /** One column's rows in render order: folders first, then files. */
  const columnItems = (parent: string): ColumnItem[] => {
    const entry = childrenByParent.get(parent);
    return [
      ...(entry?.folders ?? []).map((path) => ({ kind: 'folder' as const, path })),
      ...(entry?.files ?? []).map((file) => ({ kind: 'file' as const, file })),
    ];
  };

  /** Make a row in column `colIndex` the active selection. Folders become the
   *  chain entry at that depth (deeper columns truncate); files are leaf
   *  selections whose parent stays the deepest chain folder. */
  const selectColumnItem = (colIndex: number, item: ColumnItem) => {
    if (item.kind === 'folder') {
      setColumnPath((prev) => [...prev.slice(0, colIndex), item.path]);
      setSelectedFileId(null);
    } else {
      setColumnPath((prev) => prev.slice(0, colIndex));
      setSelectedFileId(item.file.id);
    }
  };

  /** macOS column-view arrows. The "focus column" is the deepest column when
   *  a file is selected, else the column holding the deepest chain folder.
   *  Left retreats one level, right enters a folder / opens a file, up/down
   *  move within the focus column's rows (folders-then-files order). */
  const handleColumnArrow = (dir: 'up' | 'down' | 'left' | 'right') => {
    centerActiveRowRef.current = true;
    // Row Pressables hold DOM focus after clicks; arrows move the app
    // selection without moving DOM focus, so blur the stale row, else a
    // following Enter natively "clicks" the old row and jumps the
    // selection back instead of acting on the current selection.
    if (typeof document !== 'undefined') {
      (document.activeElement as HTMLElement | null)?.blur?.();
    }
    const focusCol = selectedFileId ? columnPath.length : columnPath.length - 1;
    if (dir === 'left') {
      // Retreat one level; a selection already in the leftmost column can't
      // retreat further (Finder keeps it selected rather than clearing).
      if (selectedFileId) setSelectedFileId(null);
      else if (columnPath.length > 1) setColumnPath((prev) => prev.slice(0, -1));
      return;
    }
    if (dir === 'right') {
      if (selectedFileId) {
        const file = index.byId.get(selectedFileId);
        if (file) handleFileTap(file);
        return;
      }
      if (focusCol < 0) return;
      const items = columnItems(columnPath[columnPath.length - 1]);
      if (items[0]) selectColumnItem(columnPath.length, items[0]);
      return;
    }
    const delta = dir === 'down' ? 1 : -1;
    if (focusCol < 0) {
      // Nothing selected yet: down picks the first root row, up the last -
      // same as Finder.
      const items = columnItems('');
      const target = delta > 0 ? items[0] : items[items.length - 1];
      if (target) selectColumnItem(0, target);
      return;
    }
    const parent = focusCol === 0 ? '' : columnPath[focusCol - 1];
    const items = columnItems(parent);
    if (!items.length) return;
    const cur = items.findIndex((it) =>
      it.kind === 'folder' ? it.path === columnPath[focusCol] : it.file.id === selectedFileId
    );
    const start = cur < 0 ? (delta > 0 ? -1 : items.length) : cur;
    const next = Math.max(0, Math.min(items.length - 1, start + delta));
    selectColumnItem(focusCol, items[next]);
  };

  // Escape closes the right-click menu; pushing a scope while it's open also
  // keeps arrows/enter from navigating the browser behind the menu.
  useKeyboardShortcuts({
    enabled: ctxMenu !== null,
    onClose: () => setCtxMenu(null),
  });

  // The scope stack listens on `window` (bubble), but ConvexDialogRoot's
  // Escape handler listens on `document` - it fires first and would close
  // the whole dialog instead of just the menu. A capture-phase document
  // listener beats it, so Escape dismisses the menu first (web only).
  useEffect(() => {
    if (!ctxMenu || typeof document === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      setCtxMenu(null);
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [ctxMenu]);

  // Mounts the shared pointermove listener the drag ghost follows (web).
  useCursorFollower();

  // If the browser unmounts mid-drag, drop the window listeners + ghost.
  useEffect(
    () => () => {
      dragRef.current?.cleanup();
      hideCursorFollower(FB_DRAG_ID);
    },
    []
  );

  /* scrollIntoView walks EVERY scrollable ancestor, so on pages that
   *  themselves scroll it drags the whole layout - near the bottom of a
   *  page it yanks content off-screen just to keep a selection visible.
   *  Scope scrolling to the element's own scroll containers instead: the
   *  nearest horizontal scroller (the column rail) and, when inside it,
   *  the nearest vertical one (the column/file list). Both clamp at their
   *  ends naturally, and outer page scrollers are never touched. */
  const scrollWithinAncestors = (el: HTMLElement, center: boolean) => {
    const PAD = 8;
    const isScrollable = (n: HTMLElement, axis: 'x' | 'y') => {
      const cs = getComputedStyle(n);
      const ov = axis === 'x' ? cs.overflowX : cs.overflowY;
      const room = axis === 'x' ? n.scrollWidth - n.clientWidth : n.scrollHeight - n.clientHeight;
      return room > 1 && (ov === 'auto' || ov === 'scroll');
    };
    let x = el.parentElement;
    while (x && !isScrollable(x, 'x')) x = x.parentElement;
    let y = el.parentElement;
    while (y && (!isScrollable(y, 'y') || (x ? !x.contains(y) : false))) y = y.parentElement;
    if (x && y && !x.contains(y)) y = null;
    const er = el.getBoundingClientRect();
    if (x) {
      const xr = x.getBoundingClientRect();
      if (er.left < xr.left + PAD) x.scrollLeft += er.left - xr.left - PAD;
      else if (er.right > xr.right - PAD) x.scrollLeft += er.right - xr.right + PAD;
    }
    if (y) {
      const yr = y.getBoundingClientRect();
      if (center) y.scrollTop += er.top + er.height / 2 - (yr.top + yr.height / 2);
      else if (er.top < yr.top + PAD) y.scrollTop += er.top - yr.top - PAD;
      else if (er.bottom > yr.bottom - PAD) y.scrollTop += er.bottom - yr.bottom + PAD;
    }
  };

  // Keep the keyboard-driven selection visible: arrow-key navigation
  // recenters the active row; in column view selection changes also scroll
  // the rail's end marker so newly opened columns reveal.
  // Web-only; no DOM on native.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const center = centerActiveRowRef.current;
    centerActiveRowRef.current = false;
    if (viewMode === 'columns') {
      const marker = document.getElementById(endMarkerDomId);
      if (marker) scrollWithinAncestors(marker, false);
    }
    const rowEl = document.getElementById(activeRowDomId);
    if (rowEl) scrollWithinAncestors(rowEl, center);
  }, [
    viewMode,
    columnPath,
    selectedFileId,
    selection,
    currentFolder,
    activeRowDomId,
    endMarkerDomId,
  ]);

  // ------------------------------------------------------------- render

  const iconButton = (icon: React.ReactNode, onPress: () => void, key: string, label: string) => (
    <IconTipButton key={key} icon={icon} onPress={onPress} label={label} />
  );

  const toggleExpanded = (folder: string) =>
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folder)) next.delete(folder);
      else next.add(folder);
      return next;
    });

  const renderFolder = (folder: string, depth = 0) => {
    const pinned = isProtectedFolder(folder);
    const expanded = expandedFolders.has(folder);
    const parent = folderOfPath(folder);
    const rowKey = keyForFolder(folder);
    const soleSelected = isRowSelected(parent, rowKey) && selection.keys.size === 1;
    return (
      <ContextMenuArea
        key={folder}
        onContextMenu={(pos) => {
          selectIfOutside(parent, rowKey);
          setCtxMenu({ ...pos, items: ctxFolderItems(folder) });
        }}>
        <DragArea
          dropFolder={folder}
          onPointerDown={(info) => handleRowPointerDown(info, parent, rowKey)}>
          <Pressable
            nativeID={soleSelected ? activeRowDomId : undefined}
            onPress={(e) => {
              if (consumeDragClick()) return;
              const mods = modsOf(e);
              applySelection(parent, rowKey, mods);
              if (mods.meta || mods.shift) return;
              /* 'second' click mode: first click only selects; pressing the
               * already-selected row enters it. Clicking one row of a
               * multi-selection collapses to it instead of opening. */
              if (openOnSecondClick && !soleSelected) return;
              setCurrentFolder(folder);
            }}
            className={`border-subtle-border flex-row items-center justify-between rounded-xl border px-3 py-2.5 ${
              dropTarget === folder
                ? 'bg-accent/25'
                : isRowSelected(folderOfPath(folder), keyForFolder(folder))
                  ? 'bg-text/15'
                  : 'bg-inner-background hover:bg-text/5'
            }`}
            style={{ marginLeft: depth * 18 }}>
            <Row className="min-w-0 flex-1 items-center gap-2.5">
              {/* Disclosure triangle - expands in place, like Finder list view. */}
              <Pressable
                accessibilityLabel={expanded ? 'Collapse folder' : 'Expand folder'}
                onPress={(e) => {
                  e.stopPropagation?.();
                  toggleExpanded(folder);
                }}
                className="hover:bg-text/10 -ml-1 h-6 w-6 items-center justify-center rounded-md">
                {expanded ? (
                  <ChevronDown size={14} color="#1a1a1a" />
                ) : (
                  <ChevronRight size={14} color="#1a1a1a" />
                )}
              </Pressable>
              <Folder size={18} color="#8a7355" fill={pinned ? '#d8c49a' : 'none'} />
              <Column className="min-w-0 flex-1 gap-0">
                <FontText weight="medium" numberOfLines={1}>
                  {folderLabel(folder)}
                </FontText>
                {(() => {
                  const children = childrenByParent.get(folder);
                  const count = (children?.folders.length ?? 0) + (children?.files.length ?? 0);
                  const issueCount = folderIssueCounts.get(folder) ?? 0;
                  const warnCount = folderWarnCounts.get(folder) ?? 0;
                  return (
                    <Row className="min-w-0 items-center gap-1.5">
                      <FontText variant="subtext" className="text-xs" numberOfLines={1}>
                        {count === 0 ? 'empty' : `${count} item${count === 1 ? '' : 's'}`}
                      </FontText>
                      {issueCount > 0 && (
                        <Row className="items-center gap-0.5">
                          <TriangleAlert size={11} color={ISSUE_COLOR} />
                          <FontText className="text-xs" style={{ color: ISSUE_COLOR }}>
                            {issueCount}
                          </FontText>
                        </Row>
                      )}
                      {warnCount > 0 && (
                        <Row className="items-center gap-0.5">
                          <TriangleAlert size={11} color={DEAD_CHAIN_COLOR} />
                          <FontText className="text-xs" style={{ color: DEAD_CHAIN_COLOR }}>
                            {warnCount}
                          </FontText>
                        </Row>
                      )}
                    </Row>
                  );
                })()}
              </Column>
            </Row>
            <Row
              className={`items-center gap-0.5 ${compactRowActions ? 'w-17 shrink-0 flex-wrap justify-center' : ''}`}>
              {!pinned &&
                iconButton(
                  <Copy size={14} color="#1a1a1a" />,
                  () => filesApi.cloneFolder(folder),
                  'clone',
                  'Clone folder'
                )}
              {!pinned &&
                iconButton(
                  <FolderInput size={14} color="#1a1a1a" />,
                  () => setMoveTarget({ folderPath: folder }),
                  'move',
                  'Move folder'
                )}
              {!pinned &&
                iconButton(
                  <Pencil size={14} color="#1a1a1a" />,
                  () => openRenameFolderPrompt(folder),
                  'rename',
                  'Rename folder'
                )}
              {!pinned &&
                iconButton(
                  <Trash2 size={14} color="#a03030" />,
                  () =>
                    setDeleteTarget({
                      kind: 'folder',
                      path: folder,
                      count: folderCountUnder(folder),
                    }),
                  'delete',
                  'Delete folder'
                )}
            </Row>
          </Pressable>
        </DragArea>
      </ContextMenuArea>
    );
  };

  /** `subtitle` is an optional muted line under the file name - search
   *  results use it to show which folder each match lives in. */
  const renderFile = (file: ScriptFile, depth = 0, subtitle?: string) => {
    const placementList = placements?.byFile.get(file.id);
    const fileIssues = diagnostics?.get(file.id);
    const parent = folderOfPath(file.path);
    const rowKey = keyForFile(file);
    const soleSelected = isRowSelected(parent, rowKey) && selection.keys.size === 1;
    return (
      <ContextMenuArea
        key={file.id}
        onContextMenu={(pos) => {
          selectIfOutside(parent, rowKey);
          setCtxMenu({ ...pos, items: ctxFileItems(file) });
        }}>
        <DragArea
          dropFolder={parent}
          onPointerDown={(info) => handleRowPointerDown(info, parent, rowKey)}>
          <Pressable
            nativeID={soleSelected ? activeRowDomId : undefined}
            onPress={(e) => {
              if (consumeDragClick()) return;
              const mods = modsOf(e);
              applySelection(parent, rowKey, mods);
              if (mods.meta || mods.shift) return;
              /* 'second' click mode: first click only selects; pressing the
               * already-selected file opens it. */
              if (openOnSecondClick && !soleSelected) return;
              handleFileTap(file);
            }}
            className={`border-subtle-border flex-row items-center justify-between rounded-xl border px-3 py-2.5 ${
              isRowSelected(folderOfPath(file.path), keyForFile(file))
                ? 'bg-text/15'
                : 'bg-inner-background hover:bg-text/5'
            }`}
            // Same card indent as sibling folders - the icon is pushed right by
            // a chevron-sized spacer so icons align under the folder icons.
            style={{ marginLeft: depth * 18 }}>
            <Row className="min-w-0 flex-1 items-center gap-2.5">
              <View className="-ml-1 h-6 w-6 shrink-0" />
              {fileIcon(file, 18)}
              <Column className="min-w-0 flex-1 gap-0.5">
                <FontText weight="medium" numberOfLines={1}>
                  {fileLabel(file)}
                </FontText>
                {subtitle && (
                  <FontText variant="subtext" className="text-xs" numberOfLines={1}>
                    {subtitle}
                  </FontText>
                )}
                {fileIssues && fileIssues.length > 0 && <FileIssueLine issues={fileIssues} />}
                {placements &&
                  (placementList && placementList.length > 0 ? (
                    <Row className="flex-wrap items-center gap-1">
                      <UsedByIcon size={11} color="#6b6b6b" />
                      {placementList.slice(0, 3).map((p, i) => (
                        <FilePlacementChip
                          key={`${p.kind}-${p.fileId ?? p.owner ?? i}-${p.day ?? 0}`}
                          placement={p}
                          onNavigate={onNavigate}
                          deadEnd={deadEndFor(p)}
                        />
                      ))}
                      {placementList.length > 3 && (
                        <MorePlacementsChip
                          count={placementList.length - 3}
                          onPress={() => setPlacementsFor(file)}
                        />
                      )}
                    </Row>
                  ) : (
                    <FileWarnLine text={unusedLabel(file)} />
                  ))}
              </Column>
            </Row>
            <Row
              className={`items-center gap-0.5 ${compactRowActions ? 'w-17 shrink-0 flex-wrap justify-center' : ''}`}>
              {iconButton(
                <Pencil size={14} color="#1a1a1a" />,
                () => openRenamePrompt(file),
                'rename',
                'Rename file'
              )}
              {iconButton(
                <FolderInput size={14} color="#1a1a1a" />,
                () => setMoveTarget({ fileId: file.id }),
                'move',
                'Move file'
              )}
              {iconButton(
                <Copy size={14} color="#1a1a1a" />,
                () => filesApi.cloneFile(file.id),
                'clone',
                'Clone file'
              )}
              {iconButton(
                <Trash2 size={14} color="#a03030" />,
                () => setDeleteTarget({ kind: 'file', file }),
                'delete',
                'Delete file'
              )}
            </Row>
          </Pressable>
        </DragArea>
      </ContextMenuArea>
    );
  };

  /** Small "add here" strip at the bottom of an expanded folder's children,
   *  making it obvious the new item lands inside that folder. Inside `tags/`
   *  every file is a tag, so file buttons collapse into a single New Tag. */
  const renderAddButtons = (folder: string, depth: number) => {
    const lower = folder.toLowerCase();
    const inTags = lower === TAGS_FOLDER || lower.startsWith(`${TAGS_FOLDER}/`);
    const addButton = (icon: React.ReactNode, label: string, onPress: () => void) => (
      <Pressable
        key={label}
        onPress={onPress}
        className="hover:bg-text/10 flex-row items-center gap-1 rounded-md px-1.5 py-1">
        {icon}
        <FontText variant="subtext" className="text-xs">
          {label}
        </FontText>
      </Pressable>
    );
    return (
      <DragArea key={`add-${folder}`} dropFolder={folder}>
        <Row
          className="flex-wrap items-center gap-1.5 pt-0.5"
          style={{ marginLeft: depth * 18 + 34 }}>
          {inTags
            ? addButton(<Tag size={12} color="#1a1a1a" />, 'New Tag', () =>
                openNewTagDialog(folder)
              )
            : [
                (!fileKindsSet || fileKindsSet.has('markdown')) &&
                  addButton(<FileText size={12} color="#4a6a8a" />, 'New Markdown', () =>
                    openNewFilePrompt('markdown', folder)
                  ),
                (!fileKindsSet || fileKindsSet.has('script')) &&
                  addButton(<Code2 size={12} color="#6a4a8a" />, 'New Script', () =>
                    openNewFilePrompt('script', folder)
                  ),
              ]}
          {addButton(<FolderPlus size={12} color="#1a1a1a" />, 'New Folder', () =>
            openNewFolderPrompt(folder)
          )}
        </Row>
      </DragArea>
    );
  };

  /** The file shown in the columns-view preview column (the "used in" pane
   *  rendered one column right of the selection). */
  const selectedFile = selectedFileId ? (index.byId.get(selectedFileId) ?? null) : null;

  /** "New …" menu entries targeting `folder` - shared by the column headers
   *  and the right-click menus. */
  // ------------------------------------------------------ folder archives

  /** Download `folder`'s whole subtree as a `.folder.zip` archive. */
  const handleDownloadFolder = (folder: string) => {
    downloadFolderZip(filesApi.doc, folder)
      .then((name) => showToast(`Downloaded "${name}" as a folder archive`))
      .catch((error) => {
        console.error('Failed to download folder:', error);
        showToast('Folder download failed. Please try again.');
      });
  };

  /** Pick a `.folder.zip` and recreate its root folder inside `destFolder`
   *  (merging into the pinned folder when the name collides with one). */
  const handleImportFolder = (destFolder: string) => {
    pickFolderZipFile()
      .then(async (file) => {
        if (!file) return;
        const payload = await readFolderZip(file);
        const { rootPath, fileCount } = filesApi.importFolderTree(payload, destFolder);
        showToast(
          `Imported "${fileName(rootPath)}" - ${fileCount} file${fileCount === 1 ? '' : 's'}`
        );
        if (viewMode === 'list') setCurrentFolder(rootPath);
      })
      .catch((error) => {
        console.error('Failed to import folder:', error);
        showToast(error instanceof Error ? error.message : 'Folder import failed.');
      });
  };

  const ctxNewItems = (folder: string): CtxMenuItem[] => {
    const lower = folder.toLowerCase();
    const inTags = lower === TAGS_FOLDER || lower.startsWith(`${TAGS_FOLDER}/`);
    const items: CtxMenuItem[] = clipboardRef.current?.keys.length
      ? [
          {
            icon: <ClipboardPaste size={13} color="#1a1a1a" />,
            label: 'Paste',
            onPress: () => pasteInto(folder, clipboardRef.current?.cut ?? false),
          },
          { divider: true },
        ]
      : [];
    items.push(
      ...(inTags
        ? [
            {
              icon: <Tag size={13} color="#7E22CE" />,
              label: 'New Tag',
              onPress: () => openNewTagDialog(folder),
            },
          ]
        : [
            ...(!fileKindsSet || fileKindsSet.has('markdown')
              ? [
                  {
                    icon: <FileText size={13} color="#4a6a8a" />,
                    label: 'New Markdown',
                    onPress: () => openNewFilePrompt('markdown', folder),
                  },
                ]
              : []),
            ...(!fileKindsSet || fileKindsSet.has('script')
              ? [
                  {
                    icon: <Code2 size={13} color="#6a4a8a" />,
                    label: 'New Script',
                    onPress: () => openNewFilePrompt('script', folder),
                  },
                ]
              : []),
          ])
    );
    items.push({
      icon: <FolderPlus size={13} color="#1a1a1a" />,
      label: 'New Folder',
      onPress: () => openNewFolderPrompt(folder),
    });
    if (Platform.OS === 'web') {
      items.push({
        icon: <FolderUp size={13} color="#1a1a1a" />,
        label: 'Import folder…',
        onPress: () => handleImportFolder(folder),
      });
    }
    return items;
  };

  const ctxFileItems = (file: ScriptFile): CtxMenuItem[] => [
    {
      icon: <SquareArrowOutUpRight size={13} color="#1a1a1a" />,
      label: 'Open',
      onPress: () => handleFileTap(file),
    },
    { divider: true },
    {
      icon: <Pencil size={13} color="#1a1a1a" />,
      label: 'Rename file…',
      onPress: () => openRenamePrompt(file),
    },
    {
      icon: <FolderInput size={13} color="#1a1a1a" />,
      label: 'Move file…',
      onPress: () => setMoveTarget({ fileId: file.id }),
    },
    {
      icon: <Copy size={13} color="#1a1a1a" />,
      label: 'Duplicate',
      onPress: () => filesApi.cloneFile(file.id),
    },
    {
      icon: <ClipboardCopy size={13} color="#1a1a1a" />,
      label: 'Copy',
      onPress: () => copySelection(),
    },
    { divider: true },
    {
      icon: <Trash2 size={13} color="#a03030" />,
      label: 'Delete…',
      danger: true,
      onPress: () => setDeleteTarget({ kind: 'file', file }),
    },
  ];

  /** `open` = what "Open" means for the calling view: list navigates into
   *  the folder, columns make it the chain entry at that column. Defaults
   *  to the list-view navigation. */
  const ctxFolderItems = (folder: string, open?: () => void): CtxMenuItem[] => {
    const items: CtxMenuItem[] = [
      {
        icon: <SquareArrowOutUpRight size={13} color="#1a1a1a" />,
        label: 'Open',
        onPress: open ?? (() => setCurrentFolder(folder)),
      },
      { divider: true },
      ...ctxNewItems(folder),
    ];
    if (Platform.OS === 'web') {
      items.push(
        { divider: true },
        {
          icon: <FolderDown size={13} color="#1a1a1a" />,
          label: 'Download folder',
          onPress: () => handleDownloadFolder(folder),
        }
      );
    }
    if (!isProtectedFolder(folder)) {
      items.push(
        { divider: true },
        {
          icon: <Pencil size={13} color="#1a1a1a" />,
          label: 'Rename folder…',
          onPress: () => openRenameFolderPrompt(folder),
        },
        {
          icon: <FolderInput size={13} color="#1a1a1a" />,
          label: 'Move folder…',
          onPress: () => setMoveTarget({ folderPath: folder }),
        },
        {
          icon: <Copy size={13} color="#1a1a1a" />,
          label: 'Clone folder',
          onPress: () => filesApi.cloneFolder(folder),
        },
        {
          icon: <ClipboardCopy size={13} color="#1a1a1a" />,
          label: 'Copy',
          onPress: () => copySelection(),
        },
        {
          icon: <Trash2 size={13} color="#a03030" />,
          label: 'Delete folder…',
          danger: true,
          onPress: () =>
            setDeleteTarget({ kind: 'folder', path: folder, count: folderCountUnder(folder) }),
        }
      );
    }
    return items;
  };

  /** The ⋯ menu on a column header: folder management minus rename (the
   *  folder name itself is the rename button). Only rendered for folders
   *  that are actually editable. */
  const ctxFolderOps = (folder: string): CtxMenuItem[] => [
    {
      icon: <FolderInput size={13} color="#1a1a1a" />,
      label: 'Move folder…',
      onPress: () => setMoveTarget({ folderPath: folder }),
    },
    {
      icon: <Copy size={13} color="#1a1a1a" />,
      label: 'Clone folder',
      onPress: () => filesApi.cloneFolder(folder),
    },
    ...(Platform.OS === 'web'
      ? [
          {
            icon: <FolderDown size={13} color="#1a1a1a" />,
            label: 'Download folder',
            onPress: () => handleDownloadFolder(folder),
          } as CtxMenuItem,
        ]
      : []),
    { divider: true },
    {
      icon: <Trash2 size={13} color="#a03030" />,
      label: 'Delete folder…',
      danger: true,
      onPress: () =>
        setDeleteTarget({ kind: 'folder', path: folder, count: folderCountUnder(folder) }),
    },
  ];

  /** The toolbar ⋯ menu - the browser's "view options": how clicks behave,
   *  plus view-specific toggles and the select-all action. */
  const ctxOptionsItems = (): CtxMenuItem[] => {
    const items: CtxMenuItem[] = [
      { header: 'Open items on' },
      {
        icon: <MousePointerClick size={13} color="#1a1a1a" />,
        label: 'Single click',
        checked: !openOnSecondClick,
        onPress: () => setOpenClickPref('single'),
      },
      {
        icon: <MousePointer size={13} color="#1a1a1a" />,
        label: 'Second click',
        checked: openOnSecondClick,
        onPress: () => setOpenClickPref('second'),
      },
    ];
    const viewItems: CtxMenuItem[] = [];
    if (viewMode === 'list') {
      viewItems.push(
        {
          icon: <ChevronDown size={13} color="#1a1a1a" />,
          label: 'Expand all folders',
          onPress: () => setExpandedFolders(new Set(index.folders)),
        },
        {
          icon: <ChevronRight size={13} color="#1a1a1a" />,
          label: 'Collapse all folders',
          onPress: () => setExpandedFolders(new Set()),
        }
      );
    } else if (placements) {
      viewItems.push({
        icon: <Eye size={13} color="#1a1a1a" />,
        label: 'Show file preview',
        checked: showFilePreview,
        onPress: () => setPreviewPref(!showFilePreview),
      });
    }
    if (viewItems.length) items.push({ divider: true }, ...viewItems);
    items.push(
      { divider: true },
      {
        icon: <Search size={13} color="#1a1a1a" />,
        label: 'Search files…',
        onPress: () => searchInputRef.current?.focus(),
      }
    );
    const allKeys = orderedKeysFor(activeFolder);
    if (allKeys.length) {
      items.push(
        { divider: true },
        {
          icon: <Check size={13} color="#1a1a1a" />,
          label: 'Select all',
          onPress: () =>
            setSelection({ parent: activeFolder, keys: new Set(allKeys), anchor: allKeys[0] }),
        }
      );
    }
    return items;
  };

  /** Opens the shared context menu anchored just under the pressed
   *  element (getBoundingClientRect on web, pageX/Y fallback native). */
  const openMenuAtEvent = (e: unknown, items: CtxMenuItem[]) => {
    const ne = (e as { nativeEvent?: any })?.nativeEvent ?? {};
    const rect = (ne.target as HTMLElement | undefined)?.getBoundingClientRect?.();
    const x = rect ? rect.left : (ne.clientX ?? ne.pageX ?? 0);
    const y = rect ? rect.bottom + 4 : (ne.pageY ?? ne.clientY ?? 0) + 10;
    setCtxMenu({ x, y, items });
  };

  // ------------------------------------------------- selection & drag-drop

  const keyForFolder = (path: string) => `d:${path}`;
  const keyForFile = (file: ScriptFile) => `f:${file.id}`;

  /** Click modifiers off a PressEvent (web) - native just gets all-false. */
  const modsOf = (e: any) => {
    const ne = e?.nativeEvent ?? e ?? {};
    return { shift: !!ne.shiftKey, meta: !!(ne.metaKey || ne.ctrlKey) };
  };

  /** Finder rules: shift ranges from the anchor inside `parent`, cmd/ctrl
   *  toggles, a plain click collapses to just that row. */
  const applySelection = (parent: string, key: string, mods: { shift: boolean; meta: boolean }) => {
    setSelection((prev) => {
      if (mods.shift && prev.parent === parent && prev.anchor) {
        const ordered = columnItems(parent).map((it) =>
          it.kind === 'folder' ? keyForFolder(it.path) : keyForFile(it.file)
        );
        const a = ordered.indexOf(prev.anchor);
        const b = ordered.indexOf(key);
        if (a >= 0 && b >= 0) {
          const [lo, hi] = a < b ? [a, b] : [b, a];
          return { parent, keys: new Set(ordered.slice(lo, hi + 1)), anchor: prev.anchor };
        }
      }
      if (mods.meta && prev.parent === parent) {
        const keys = new Set(prev.keys);
        if (keys.has(key)) keys.delete(key);
        else keys.add(key);
        return { parent, keys, anchor: key };
      }
      return { parent, keys: new Set([key]), anchor: key };
    });
  };

  const isRowSelected = (parent: string, key: string) =>
    selection.parent === parent && selection.keys.has(key);

  /** If the row pressed isn't in the selection, the selection becomes just
   *  it - same as Finder when right-clicking/dragging a stray row. */
  const selectIfOutside = (parent: string, key: string) => {
    if (!isRowSelected(parent, key)) {
      setSelection({ parent, keys: new Set([key]), anchor: key });
    }
  };

  const consumeDragClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return true;
    }
    return false;
  };

  /** Can this dragged item legally land in `dest`? Folders can't go into
   *  themselves/their descendants or be protected (`tags/`); files always
   *  can (moveFile no-ops same-folder drops and rejects collisions). */
  const canDropInto = (key: string, dest: string) => {
    if (!key.startsWith('d:')) return true;
    const path = key.slice(2);
    if (isProtectedFolder(path)) return false;
    const lower = path.toLowerCase();
    const destLower = dest.toLowerCase();
    return destLower !== lower && !destLower.startsWith(`${lower}/`);
  };

  /** The drag ghost: a dark pill (matches the tooltip chrome) with the
   *  item's icon + name, or "N items" for a multi-drag. Rendered into the
   *  detached follower root, so it's plain elements + inline styles. */
  const dragGhost = (keys: string[]) => {
    const first = keys[0];
    let icon: React.ReactNode = <Folder size={13} color="#d8c49a" fill="#d8c49a" />;
    let label = 'item';
    if (first.startsWith('f:')) {
      const file = index.byId.get(first.slice(2));
      if (file) {
        icon = fileIcon(file, 13, true);
        label = fileLabel(file);
      }
    } else {
      label = folderLabel(first.slice(2));
    }
    return React.createElement(
      'div',
      {
        style: {
          alignItems: 'center',
          background: 'rgba(30,24,16,0.92)',
          borderRadius: 8,
          boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
          color: '#f6eedb',
          display: 'flex',
          fontFamily: 'LibreBaskerville, serif',
          fontSize: 12,
          gap: 6,
          padding: '5px 10px',
          whiteSpace: 'nowrap',
        },
      },
      icon,
      React.createElement('span', null, keys.length === 1 ? label : `${keys.length} items`)
    );
  };

  /** pointerdown on a row (DragArea, web only): arms a pending drag.
   *  >5px of movement activates it - the selection set becomes the payload
   *  (or just the row if it wasn't selected) and the ghost follows the
   *  cursor via the shared cursor follower. pointerup over a
   *  `[data-file-drop]` region performs the moves; Escape cancels. */
  const handleRowPointerDown = (info: DragPointerInfo, parent: string, key: string) => {
    if (info.pointerType === 'touch') return; // touch scroll takes precedence
    if (key.startsWith('d:') && isProtectedFolder(key.slice(2))) return;
    dragRef.current?.cleanup();

    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      if (!d.active) {
        if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 5) return;
        d.active = true;
        const payload =
          selection.parent === d.parent && selection.keys.has(d.key)
            ? [...selection.keys]
            : [d.key];
        d.items = payload.filter((k) => !k.startsWith('d:') || !isProtectedFolder(k.slice(2)));
        if (!d.items.length) {
          finish(false);
          return;
        }
        setSelection({ parent: d.parent, keys: new Set(d.items), anchor: d.key });
        showCursorFollower(FB_DRAG_ID, dragGhost(d.items));
      }
      const dropEl = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('[data-file-drop]');
      const dest = dropEl ? dropEl.getAttribute('data-file-drop') : null;
      const next = dest !== null && d.items.some((k) => canDropInto(k, dest)) ? dest : null;
      if (next !== d.target) {
        d.target = next;
        setDropTarget(next);
      }
    };

    const finish = (drop: boolean) => {
      const d = dragRef.current;
      if (!d) return;
      d.cleanup();
      dragRef.current = null;
      if (!d.active) return;
      hideCursorFollower(FB_DRAG_ID);
      setDropTarget(null);
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
      if (drop && d.target !== null) {
        const dest = d.target;
        for (const k of d.items) {
          if (!canDropInto(k, dest)) continue;
          if (k.startsWith('d:')) filesApi.moveFolder(k.slice(2), dest);
          else filesApi.moveFile(k.slice(2), dest);
        }
        setSelection({ parent: '', keys: new Set<string>(), anchor: null });
      }
    };

    const onUp = () => finish(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish(false);
    };
    const cleanup = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('keydown', onKey);
    };

    dragRef.current = {
      key,
      parent,
      startX: info.x,
      startY: info.y,
      active: false,
      items: [],
      target: null,
      cleanup,
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('keydown', onKey);
  };

  /** A column/list level's row keys in render order (folders then files). */
  const orderedKeysFor = (parent: string) =>
    columnItems(parent).map((it) =>
      it.kind === 'folder' ? keyForFolder(it.path) : keyForFile(it.file)
    );

  const copySelection = (cut = false) => {
    if (!selection.keys.size) return;
    clipboardRef.current = { keys: [...selection.keys], cut };
  };

  /** Paste the clipboard into `dest` - copy clones the items, move relocates
   *  them (Finder's Cmd+Opt+V). Invalid targets (folder into itself, etc.)
   *  per item are skipped; moveFolder/moveFile guard collisions too. */
  const pasteInto = (dest: string, move: boolean) => {
    const clip = clipboardRef.current;
    if (!clip?.keys.length) return;
    for (const k of clip.keys) {
      if (!canDropInto(k, dest)) continue;
      if (k.startsWith('d:')) {
        if (move) filesApi.moveFolder(k.slice(2), dest);
        else filesApi.copyFolderInto(k.slice(2), dest);
      } else {
        if (move) filesApi.moveFile(k.slice(2), dest);
        else filesApi.copyFileInto(k.slice(2), dest);
      }
    }
    // Folder keys are paths - stale after a move, so a move-paste is spent.
    if (move) clipboardRef.current = null;
  };

  /** Cmd+Backspace/Delete on the selection: confirm-gated bulk delete.
   *  Protected folders are excluded, and rows inside a selected folder are
   *  dropped (deleting the folder covers them). */
  const deleteSelection = () => {
    const keys = [...selection.keys].filter(
      (k) => !k.startsWith('d:') || !isProtectedFolder(k.slice(2))
    );
    if (!keys.length) return;
    const folderPaths = keys.filter((k) => k.startsWith('d:')).map((k) => k.slice(2).toLowerCase());
    const topKeys = keys.filter((k) => {
      const itemPath = k.startsWith('d:') ? k.slice(2) : (index.byId.get(k.slice(2))?.path ?? '');
      const dir = folderOfPath(itemPath).toLowerCase();
      return !folderPaths.some((f) => dir === f || dir.startsWith(`${f}/`));
    });
    if (topKeys.length) {
      setDeleteTarget({ kind: 'multi', keys: topKeys, count: topKeys.length });
    }
  };

  /** Finder-style combos on the browser rows: Cmd+C copy, Cmd+V paste,
   *  Cmd+Opt+V move, Cmd+D duplicate, Cmd+A select all, Cmd+X cut,
   *  Cmd+Backspace/Delete delete. Returns true when consumed. */
  const handleBrowserKey = (e: KeyboardEvent): boolean => {
    if (!(e.metaKey || e.ctrlKey)) return false;
    const k = e.key.toLowerCase();
    if (k === 'a' && !e.altKey && !e.shiftKey) {
      const keys = orderedKeysFor(activeFolder);
      if (!keys.length) return false;
      setSelection({ parent: activeFolder, keys: new Set(keys), anchor: keys[0] });
      return true;
    }
    if (k === 'c' && !e.altKey) {
      if (!selection.keys.size) return false;
      copySelection(false);
      return true;
    }
    if (k === 'x' && !e.altKey) {
      if (!selection.keys.size) return false;
      copySelection(true);
      return true;
    }
    if (k === 'd' && !e.altKey && !e.shiftKey) {
      if (!selection.keys.size) return false;
      for (const key of selection.keys) {
        if (key.startsWith('d:')) {
          const p = key.slice(2);
          if (!isProtectedFolder(p)) filesApi.cloneFolder(p);
        } else filesApi.cloneFile(key.slice(2));
      }
      return true;
    }
    if (k === 'v') {
      if (!clipboardRef.current?.keys.length) return false;
      pasteInto(activeFolder, e.altKey || clipboardRef.current.cut);
      return true;
    }
    if (k === 'backspace' || k === 'delete') {
      if (!selection.keys.size) return false;
      deleteSelection();
      return true;
    }
    return false;
  };

  /** Rows in list-view render order across the expanded tree. Each row
   *  carries its parent folder so the per-level selection can follow the
   *  cursor when it steps in/out of expanded children. */
  const visibleListRows = (): { key: string; parent: string; folder: string | null }[] => {
    const rows: { key: string; parent: string; folder: string | null }[] = [];
    const walk = (parent: string) => {
      const entry = childrenByParent.get(parent);
      for (const folder of entry?.folders ?? []) {
        rows.push({ key: keyForFolder(folder), parent, folder });
        if (expandedFolders.has(folder)) walk(folder);
      }
      for (const file of entry?.files ?? [])
        rows.push({ key: keyForFile(file), parent, folder: null });
    };
    walk(currentFolder);
    return rows;
  };

  /** List-view arrows, Finder-style over the flattened tree: up/down move a
   *  single selection through every visible row (crossing into expanded
   *  children), right expands a folder / steps into its first child / opens
   *  a file, left steps out of an expanded folder / collapses / goes up a
   *  level. Multi-selections collapse to the next row like Finder's arrows. */
  const handleListArrow = (dir: 'up' | 'down' | 'left' | 'right') => {
    centerActiveRowRef.current = true;
    // See handleColumnArrow: blur the stale DOM-focused row so a following
    // Enter doesn't natively click it back into focus.
    if (typeof document !== 'undefined') {
      (document.activeElement as HTMLElement | null)?.blur?.();
    }
    const rows = visibleListRows();
    if (!rows.length) {
      if (dir === 'left' && currentFolder) setCurrentFolder(folderOfPath(currentFolder));
      return;
    }
    const soleKey = selection.keys.size === 1 ? [...selection.keys][0] : null;
    const cur = soleKey
      ? rows.findIndex((r) => r.key === soleKey && r.parent === selection.parent)
      : -1;
    if (dir === 'left') {
      const row = cur >= 0 ? rows[cur] : null;
      if (row && row.parent !== currentFolder) {
        // Selection sits inside an expanded folder: step out to its row.
        setSelection({
          parent: folderOfPath(row.parent),
          keys: new Set([keyForFolder(row.parent)]),
          anchor: keyForFolder(row.parent),
        });
      } else if (row?.folder && expandedFolders.has(row.folder)) {
        toggleExpanded(row.folder);
      } else if (currentFolder) {
        setCurrentFolder(folderOfPath(currentFolder));
      }
      return;
    }
    if (dir === 'right') {
      const row = cur >= 0 ? rows[cur] : null;
      if (!row) return;
      if (row.folder) {
        if (!expandedFolders.has(row.folder)) toggleExpanded(row.folder);
        else {
          const child = rows[cur + 1];
          if (child?.parent === row.folder) {
            setSelection({ parent: child.parent, keys: new Set([child.key]), anchor: child.key });
          }
        }
      } else {
        const file = index.byId.get(row.key.slice(2));
        if (file) handleFileTap(file);
      }
      return;
    }
    const delta = dir === 'down' ? 1 : -1;
    const start = cur < 0 ? (delta > 0 ? -1 : rows.length) : cur;
    const next = Math.max(0, Math.min(rows.length - 1, start + delta));
    const row = rows[next];
    setSelection({ parent: row.parent, keys: new Set([row.key]), anchor: row.key });
  };

  /** Enter in list view activates the sole selection the same way a second
   *  click does: folders navigate in, files open. */
  const handleListActivate = () => {
    const key = selection.keys.size === 1 ? [...selection.keys][0] : null;
    if (!key) return;
    if (key.startsWith('d:')) setCurrentFolder(key.slice(2));
    else {
      const file = index.byId.get(key.slice(2));
      if (file) handleFileTap(file);
    }
  };

  /** Search results: up/down move a single selection through the flat list.
   *  Left/right stay free for caret movement in the search field. */
  const handleSearchArrow = (dir: 'up' | 'down' | 'left' | 'right') => {
    if (dir === 'left' || dir === 'right') return;
    centerActiveRowRef.current = true;
    // Blur stale row focus (see handleColumnArrow) - but never a text input:
    // ArrowDown inside the search field selects results without losing the
    // ability to keep typing.
    if (typeof document !== 'undefined') {
      const ae = document.activeElement as HTMLElement | null;
      if (ae && ae.tagName !== 'INPUT' && ae.tagName !== 'TEXTAREA') ae.blur?.();
    }
    const rows = searchResults.map((f) => ({
      key: keyForFile(f),
      parent: folderOfPath(f.path),
    }));
    if (!rows.length) return;
    const soleKey = selection.keys.size === 1 ? [...selection.keys][0] : null;
    const cur = soleKey
      ? rows.findIndex((r) => r.key === soleKey && r.parent === selection.parent)
      : -1;
    const delta = dir === 'down' ? 1 : -1;
    const start = cur < 0 ? (delta > 0 ? -1 : rows.length) : cur;
    const next = Math.max(0, Math.min(rows.length - 1, start + delta));
    const row = rows[next];
    setSelection({ parent: row.parent, keys: new Set([row.key]), anchor: row.key });
  };

  /** Enter while searching opens the sole-selected result when it's one of
   *  the matches, else the first result - Spotlight-style quick open. */
  const handleSearchActivate = () => {
    const key = selection.keys.size === 1 ? [...selection.keys][0] : null;
    const selectedMatch =
      key?.startsWith('f:') && searchResults.some((f) => keyForFile(f) === key)
        ? index.byId.get(key.slice(2))
        : null;
    const target = selectedMatch ?? searchResults[0] ?? null;
    if (target) handleFileTap(target);
  };

  /** List view: one folder level - expanded folders recurse into their
   *  children (indented). Folders first, then files, same as before. */
  const renderEntries = (parent: string, depth: number): React.ReactNode[] => {
    const entry = childrenByParent.get(parent);
    if (!entry) return [];
    const out: React.ReactNode[] = [];
    for (const folder of entry.folders) {
      out.push(renderFolder(folder, depth));
      if (expandedFolders.has(folder)) {
        out.push(...renderEntries(folder, depth + 1));
        out.push(renderAddButtons(folder, depth + 1));
      }
    }
    for (const file of entry.files) out.push(renderFile(file, depth));
    return out;
  };

  // Scoped like the dialogs: arrows/enter only reach the browser while it's
  // the top-most layer, and pause while its own prompts sit on top. Both
  // views get arrow navigation + Enter (= →: enters/expands a folder, opens
  // a file); clipboard combos work in either view.
  useKeyboardShortcuts({
    enabled: !namePrompt && !moveTarget && !deleteTarget && !placementsFor,
    onArrowKey: searching
      ? handleSearchArrow
      : viewMode === 'columns'
        ? handleColumnArrow
        : handleListArrow,
    // Enter does exactly what → does: enters a selected folder, opens a
    // selected file. While searching it opens the selected/top match.
    onPrimaryAction: searching
      ? handleSearchActivate
      : viewMode === 'columns'
        ? () => handleColumnArrow('right')
        : handleListActivate,
    onKey: handleBrowserKey,
    // Escape clears an active search before it can close the browser.
    onClose: () => {
      if (searching) setSearchText('');
      else onCancel?.();
    },
  });

  return (
    <>
      {/* Gate on the files doc + the persisted view pref so the listing (and
       *  the view toggle) fades in already settled: no list→columns flash and
       *  no empty-folder flash on open. */}
      <LoadingContainer
        dependencies={[viewPref, !filesApi.isLoading]}
        loadingText="Loading files"
        loadingDelayMs={250}
        className="min-h-0 flex-1">
        <Column className="min-h-0 flex-1 gap-3 pt-3">
          {/* toolbar */}
          <Row className="flex-wrap items-center gap-2">
            {/* New … buttons live in the column headers' + menus in column
             *  view; list view shows them as a segmented group matching the
             *  view toggle. */}
            {viewMode === 'list' && (
              <Row className="border-subtle-border gap-0 overflow-hidden rounded-lg border">
                {(!fileKindsSet || fileKindsSet.has('markdown')) && (
                  <ViewToggleButton
                    icon={<FileText size={15} color="#4a6a8a" />}
                    label="New Markdown"
                    active={false}
                    first
                    onPress={() => openNewFilePrompt('markdown')}
                  />
                )}
                {(!fileKindsSet || fileKindsSet.has('script')) && (
                  <ViewToggleButton
                    icon={<Code2 size={15} color="#6a4a8a" />}
                    label="New Script"
                    active={false}
                    first={!!fileKindsSet && !fileKindsSet.has('markdown')}
                    onPress={() => openNewFilePrompt('script')}
                  />
                )}
                <ViewToggleButton
                  icon={<FolderPlus size={15} color="#1a1a1a" />}
                  label="New Folder"
                  active={false}
                  first={false}
                  onPress={() => openNewFolderPrompt()}
                />
              </Row>
            )}
            {/* view toggle - macOS segmented control (list / columns) */}
            <View className="flex-1" />
            <Row className="border-subtle-border gap-0 overflow-hidden rounded-lg border">
              <ViewToggleButton
                icon={<List size={15} color="#1a1a1a" />}
                label="List view"
                active={viewMode === 'list'}
                first
                onPress={() => setViewPref('list')}
              />
              <ViewToggleButton
                icon={<Columns3 size={15} color="#1a1a1a" />}
                label="Column view"
                active={viewMode === 'columns'}
                first={false}
                onPress={() => setViewPref('columns')}
              />
            </Row>
            {/* Browser options - same chrome as the view toggle but a
             *  separate control: click behavior + view-specific options. */}
            <Row className="border-subtle-border gap-0 overflow-hidden rounded-lg border">
              <ViewToggleButton
                icon={<Ellipsis size={15} color="#1a1a1a" />}
                label="File browser options"
                active={false}
                first
                onPress={(e) => openMenuAtEvent(e, ctxOptionsItems())}
              />
            </Row>
            {/* Search field - a non-empty query swaps the listing for flat
             *  results with an All files / folder scope bar underneath. The
             *  whole field is a press target that focuses the input. The h-7
             *  sits on the inner content (not the bordered shell) so its
             *  outer height is 28+border - exactly like the toggle groups
             *  (h-7 buttons inside a bordered row) it sits beside. */}
            <Pressable
              onPress={() => searchInputRef.current?.focus()}
              className="border-subtle-border w-44 cursor-text flex-row overflow-hidden rounded-lg border px-2">
              <Row className="h-7 min-w-0 flex-1 items-center gap-1.5">
                <Search size={13} color="#0006" style={{ flexShrink: 0 }} />
                <FontTextInput
                  ref={searchInputRef}
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholder="Search files"
                  returnKeyType="search"
                  onSubmitEditing={handleSearchActivate}
                  accessibilityLabel="Search files"
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="min-w-0 flex-1 text-sm"
                  style={{ paddingVertical: 0 }}
                  // Arrows inside the field move the result selection and
                  // Escape clears the query (the shortcut scope skips focused
                  // text inputs).
                  onKeyPress={(e: any) => {
                    const key = e?.nativeEvent?.key ?? e?.key;
                    if (key === 'ArrowDown') handleSearchArrow('down');
                    else if (key === 'ArrowUp') handleSearchArrow('up');
                    else if (key === 'Escape') setSearchText('');
                  }}
                />
                {searchText.length > 0 && (
                  <Pressable
                    accessibilityLabel="Clear search"
                    onPress={() => setSearchText('')}
                    className="hover:bg-text/10 -mr-1 h-5 w-5 shrink-0 items-center justify-center rounded-full">
                    <X size={11} color="#0008" />
                  </Pressable>
                )}
              </Row>
            </Pressable>
          </Row>

          {/* breadcrumbs - list view only; columns are their own trail */}
          {viewMode === 'list' && (
            <Row className="flex-wrap items-center gap-1">
              {currentFolder && (
                <IconTipButton
                  icon={<ChevronLeft size={16} color="#1a1a1a" />}
                  onPress={() => setCurrentFolder(folderOfPath(currentFolder))}
                  label="Up a folder"
                  size="h-7 w-7"
                />
              )}
              {breadcrumbs.map((crumb, i) => (
                <React.Fragment key={crumb.path || 'root'}>
                  {i > 0 && <FontText variant="subtext">/</FontText>}
                  <DragArea dropFolder={crumb.path}>
                    <Pressable
                      onPress={() => setCurrentFolder(crumb.path)}
                      className={`rounded-md px-1.5 py-0.5 ${
                        dropTarget === crumb.path ? 'bg-accent/25' : 'hover:bg-text/10'
                      }`}>
                      <FontText
                        weight={i === breadcrumbs.length - 1 ? 'medium' : 'regular'}
                        className="text-sm">
                        {crumb.label}
                      </FontText>
                    </Pressable>
                  </DragArea>
                </React.Fragment>
              ))}
            </Row>
          )}

          {/* listing - while searching, a flat result list with a scope bar
           *  replaces the tree/column views entirely. */}
          {searching ? (
            <>
              {/* Finder-style scope bar: 'All files' (default) searches the
               *  whole doc; the folder option limits to the active folder's
               *  subtree. */}
              <Row className="flex-wrap items-center gap-2">
                <Row className="border-subtle-border gap-0 overflow-hidden rounded-lg border">
                  {(
                    [
                      ['all', 'All files'],
                      ['folder', activeFolder ? folderLabel(activeFolder) : 'This folder'],
                    ] as const
                  ).map(([scope, label], i) => (
                    <Pressable
                      key={scope}
                      accessibilityLabel={`Search scope: ${label}`}
                      onPress={() => setScopePref(scope)}
                      className={`h-7 items-center justify-center px-3 ${
                        searchScope === scope ? 'bg-text/20' : 'hover:bg-text/5'
                      } ${i === 0 ? '' : 'border-subtle-border border-l'}`}>
                      <FontText className="text-xs" numberOfLines={1}>
                        {label}
                      </FontText>
                    </Pressable>
                  ))}
                </Row>
                <FontText variant="subtext" className="text-xs">
                  {searchResults.length} result{searchResults.length === 1 ? '' : 's'}
                </FontText>
              </Row>
              <ShadowScrollView className="min-h-0 flex-1" scrollViewClassName="min-h-0 flex-1">
                <Column className="gap-1.5 pb-2">
                  {searchResults.map((file) => renderFile(file, 0, searchPathHint(file)))}
                  {searchResults.length === 0 && (
                    <Column className="items-center gap-1 py-10">
                      <Search size={24} color="#0006" />
                      <FontText variant="subtext" className="text-sm">
                        {`No files match “${searchText.trim()}”`}
                      </FontText>
                    </Column>
                  )}
                </Column>
              </ShadowScrollView>
            </>
          ) : viewMode === 'columns' ? (
            /* macOS column view: column i shows the folder selected in i-1.
             * Navigated ancestors keep the dim highlight; the active selection
             * (deepest chain folder, or the selected file) is solid dark. */
            <ShadowScrollView horizontal className="min-h-0 flex-1">
              <Row className="items-stretch gap-0">
                {Array.from({ length: columnPath.length + 1 }, (_, colIndex) => {
                  const parent = colIndex === 0 ? '' : columnPath[colIndex - 1];
                  const children = childrenByParent.get(parent) ?? { folders: [], files: [] };
                  const chainFolder = columnPath[colIndex];
                  const activeCol = selectedFileId ? -1 : columnPath.length - 1;
                  return (
                    /* Right-click anywhere in the column's chrome - header or
                     * empty space - offers the "New …" set for this folder.
                     * Rows below stopPropagation to their own menus. */
                    <ContextMenuArea
                      key={parent || 'root'}
                      onContextMenu={(pos) => setCtxMenu({ ...pos, items: ctxNewItems(parent) })}>
                      <DragArea
                        dropFolder={parent}
                        onHoverChange={(h) =>
                          setHoveredColKey((prev) => (h ? parent : prev === parent ? null : prev))
                        }>
                        <View
                          className={`border-subtle-border h-[55vh] w-60 border-r ${
                            dropTarget === parent ? 'bg-accent/10' : ''
                          }`}>
                          {/* Column header: ⋯ = folder ops (Move/Clone/Delete),
                           *  the name itself is the rename button, + = New…
                           *  menu. Controls fade in on column hover or when the
                           *  column holds the keyboard selection; always shown
                           *  on native (no hover). */}
                          {(() => {
                            const editable = parent !== '' && !isProtectedFolder(parent);
                            const isFocusCol = selectedFileId
                              ? colIndex === columnPath.length
                              : colIndex === columnPath.length - 1;
                            const show =
                              Platform.OS !== 'web' || hoveredColKey === parent || isFocusCol;
                            const iconBtn =
                              'hover:bg-text/10 h-6 w-6 items-center justify-center rounded-md';
                            return (
                              /* z-10: the ShadowScrollView below extends a
                               * -12px top-fade margin over this row so rows
                               *  fade under it; keep the header above it for
                               *  hit-testing or the buttons' bottom halves go
                               *  dead. */
                              <Row className="border-subtle-border relative z-10 items-center gap-1 border-b px-1.5 py-1">
                                <Pressable
                                  onPress={(e) => openMenuAtEvent(e, ctxFolderOps(parent))}
                                  pointerEvents={editable && show ? 'auto' : 'none'}
                                  style={{ opacity: editable && show ? 1 : 0 }}
                                  className={iconBtn}>
                                  <Ellipsis size={13} color="#1a1a1a" />
                                </Pressable>
                                {editable ? (
                                  <Pressable
                                    onPress={() => openRenameFolderPrompt(parent)}
                                    className="border-subtle-border hover:bg-text/5 min-w-0 flex-1 items-center rounded-md border px-1.5 py-0.5">
                                    <FontText weight="medium" className="text-xs" numberOfLines={1}>
                                      {folderLabel(parent)}
                                    </FontText>
                                  </Pressable>
                                ) : (
                                  <FontText
                                    weight="medium"
                                    className="min-w-0 flex-1 text-xs"
                                    numberOfLines={1}>
                                    {parent === '' ? 'Files' : folderLabel(parent)}
                                  </FontText>
                                )}
                                <Pressable
                                  onPress={(e) => openMenuAtEvent(e, ctxNewItems(parent))}
                                  pointerEvents={show ? 'auto' : 'none'}
                                  style={{ opacity: show ? 1 : 0 }}
                                  className={iconBtn}>
                                  <Plus size={14} color="#1a1a1a" />
                                </Pressable>
                              </Row>
                            );
                          })()}
                          <ShadowScrollView
                            className="min-h-0 flex-1"
                            scrollViewClassName="min-h-0 flex-1">
                            <Column className="min-h-full gap-1 p-1.5">
                              {children.folders.map((folder) => {
                                const onPath = chainFolder === folder;
                                const isActive = onPath && colIndex === activeCol;
                                return (
                                  <ContextMenuArea
                                    key={folder}
                                    onContextMenu={(pos) => {
                                      selectIfOutside(parent, keyForFolder(folder));
                                      selectColumnItem(colIndex, {
                                        kind: 'folder',
                                        path: folder,
                                      });
                                      setCtxMenu({
                                        ...pos,
                                        items: ctxFolderItems(folder, () =>
                                          selectColumnItem(colIndex, {
                                            kind: 'folder',
                                            path: folder,
                                          })
                                        ),
                                      });
                                    }}>
                                    <DragArea
                                      dropFolder={folder}
                                      onPointerDown={(info) =>
                                        handleRowPointerDown(info, parent, keyForFolder(folder))
                                      }>
                                      <Pressable
                                        nativeID={isActive ? activeRowDomId : undefined}
                                        onPress={(e) => {
                                          if (consumeDragClick()) return;
                                          const mods = modsOf(e);
                                          applySelection(parent, keyForFolder(folder), mods);
                                          if (mods.meta || mods.shift) return;
                                          selectColumnItem(colIndex, {
                                            kind: 'folder',
                                            path: folder,
                                          });
                                        }}
                                        className={`flex-row items-center gap-2 rounded-lg px-2 py-1.5 ${
                                          dropTarget === folder
                                            ? 'bg-accent/40'
                                            : isActive
                                              ? 'bg-text'
                                              : isRowSelected(parent, keyForFolder(folder))
                                                ? 'bg-accent/25'
                                                : onPath
                                                  ? 'bg-text/15'
                                                  : 'hover:bg-text/5'
                                        }`}>
                                        <Folder
                                          size={15}
                                          color={isActive ? '#e8e0d0' : '#8a7355'}
                                          fill={isProtectedFolder(folder) ? '#d8c49a' : 'none'}
                                        />
                                        <FontText
                                          className="flex-1 text-sm"
                                          color={isActive ? 'text-inverted' : undefined}
                                          numberOfLines={1}>
                                          {folderLabel(folder)}
                                        </FontText>
                                        {(() => {
                                          const issueCount = folderIssueCounts.get(folder) ?? 0;
                                          const warnCount = folderWarnCounts.get(folder) ?? 0;
                                          return issueCount > 0 || warnCount > 0 ? (
                                            <Row className="items-center gap-1">
                                              {issueCount > 0 && (
                                                <Row className="items-center gap-0.5">
                                                  <TriangleAlert
                                                    size={11}
                                                    color={
                                                      isActive ? ISSUE_COLOR_INVERTED : ISSUE_COLOR
                                                    }
                                                  />
                                                  <FontText
                                                    className="text-[11px]"
                                                    style={{
                                                      color: isActive
                                                        ? ISSUE_COLOR_INVERTED
                                                        : ISSUE_COLOR,
                                                    }}>
                                                    {issueCount}
                                                  </FontText>
                                                </Row>
                                              )}
                                              {warnCount > 0 && (
                                                <Row className="items-center gap-0.5">
                                                  <TriangleAlert
                                                    size={11}
                                                    color={
                                                      isActive
                                                        ? WARN_COLOR_INVERTED
                                                        : DEAD_CHAIN_COLOR
                                                    }
                                                  />
                                                  <FontText
                                                    className="text-[11px]"
                                                    style={{
                                                      color: isActive
                                                        ? WARN_COLOR_INVERTED
                                                        : DEAD_CHAIN_COLOR,
                                                    }}>
                                                    {warnCount}
                                                  </FontText>
                                                </Row>
                                              )}
                                            </Row>
                                          ) : null;
                                        })()}
                                        <ChevronRight
                                          size={13}
                                          color={isActive ? '#ffffff' : '#1a1a1a'}
                                        />
                                      </Pressable>
                                    </DragArea>
                                  </ContextMenuArea>
                                );
                              })}
                              {children.files.map((file) => {
                                const isActive = file.id === selectedFileId;
                                const fileIssues = diagnostics?.get(file.id);
                                const unused =
                                  !!placements &&
                                  (placements.byFile.get(file.id)?.length ?? 0) === 0;
                                return (
                                  <ContextMenuArea
                                    key={file.id}
                                    onContextMenu={(pos) => {
                                      selectIfOutside(parent, keyForFile(file));
                                      selectColumnItem(colIndex, { kind: 'file', file });
                                      setCtxMenu({ ...pos, items: ctxFileItems(file) });
                                    }}>
                                    <DragArea
                                      onPointerDown={(info) =>
                                        handleRowPointerDown(info, parent, keyForFile(file))
                                      }>
                                      <Pressable
                                        nativeID={isActive ? activeRowDomId : undefined}
                                        onPress={(e) => {
                                          if (consumeDragClick()) return;
                                          const mods = modsOf(e);
                                          /* 'second' click mode (the default):
                                           *  a plain click only selects and opens
                                           *  the preview column; pressing the
                                           *  already-selected file opens it -
                                           *  unless the click is collapsing a
                                           *  multi-selection. 'single' opens on
                                           *  the first click. */
                                          const sole =
                                            file.id === selectedFileId &&
                                            (!isRowSelected(parent, keyForFile(file)) ||
                                              selection.keys.size === 1);
                                          applySelection(parent, keyForFile(file), mods);
                                          if (mods.meta || mods.shift) return;
                                          if (openOnSecondClick ? sole : true) {
                                            handleFileTap(file);
                                            return;
                                          }
                                          selectColumnItem(colIndex, { kind: 'file', file });
                                        }}
                                        className={`flex-row items-center gap-2 rounded-lg px-2 py-1.5 ${
                                          isActive
                                            ? 'bg-text'
                                            : isRowSelected(parent, keyForFile(file))
                                              ? 'bg-accent/25'
                                              : 'hover:bg-text/5'
                                        }`}>
                                        {fileIcon(file, 15, isActive)}
                                        <Column className="min-w-0 flex-1 gap-0">
                                          <FontText
                                            className="text-sm"
                                            color={isActive ? 'text-inverted' : undefined}
                                            numberOfLines={1}>
                                            {fileLabel(file)}
                                          </FontText>
                                          {fileIssues && fileIssues.length > 0 && (
                                            <FileIssueLine
                                              issues={fileIssues}
                                              inverted={isActive}
                                            />
                                          )}
                                          {unused && (
                                            <FileWarnLine
                                              text={unusedLabel(file)}
                                              inverted={isActive}
                                            />
                                          )}
                                        </Column>
                                      </Pressable>
                                    </DragArea>
                                  </ContextMenuArea>
                                );
                              })}
                              {children.folders.length === 0 && children.files.length === 0 && (
                                <FontText variant="subtext" className="px-2 py-2 text-xs">
                                  Empty
                                </FontText>
                              )}
                              {/* Filler so right-click on empty column space
                               *  still hits this ContextMenuArea, not the
                               *  ShadowScrollView's scroll content. */}
                              <View className="flex-1" />
                            </Column>
                          </ShadowScrollView>
                        </View>
                      </DragArea>
                    </ContextMenuArea>
                  );
                })}
                {/* Preview column, one column right of the selected file:
                 *  the file options (rename field + move/duplicate/delete)
                 *  live here instead of a modal, with the "used in" info
                 *  underneath. Toggleable from the ⋯ options menu. */}
                {selectedFile &&
                  placements &&
                  showFilePreview &&
                  (() => {
                    const file = selectedFile;
                    const list = placements.byFile.get(file.id) ?? [];
                    const sideAction = (
                      icon: React.ReactNode,
                      label: string,
                      onPress: () => void,
                      danger = false
                    ) => (
                      <Pressable
                        onPress={onPress}
                        className="border-subtle-border bg-inner-background hover:bg-text/5 flex-row items-center gap-2 rounded-xl border px-3 py-2">
                        {icon}
                        <FontText
                          weight="medium"
                          numberOfLines={1}
                          className={`text-[13px] ${danger ? 'text-[#a03030]' : ''}`.trim()}>
                          {label}
                        </FontText>
                      </Pressable>
                    );
                    return (
                      <View className="h-[55vh] w-60">
                        <ShadowScrollView
                          className="min-h-0 flex-1"
                          scrollViewClassName="min-h-0 flex-1">
                          <Column className="gap-2 p-3">
                            <Row className="items-center gap-2">
                              {fileIcon(file, 16)}
                              <FontText
                                weight="medium"
                                className="flex-1 text-sm"
                                numberOfLines={1}>
                                {fileLabel(file)}
                              </FontText>
                            </Row>
                            {(() => {
                              const issues = diagnostics?.get(file.id);
                              return issues && issues.length > 0 ? (
                                <FileIssueLine issues={issues} />
                              ) : null;
                            })()}
                            <View className="border-subtle-border border-b" />
                            <Column className="gap-1.5">
                              {sideAction(
                                <Pencil size={15} color="rgb(46, 41, 37)" />,
                                'Rename…',
                                () => openRenamePrompt(file)
                              )}
                              {sideAction(
                                <FolderInput size={15} color="rgb(46, 41, 37)" />,
                                'Move…',
                                () => setMoveTarget({ fileId: file.id })
                              )}
                              {sideAction(
                                <Copy size={15} color="rgb(46, 41, 37)" />,
                                'Duplicate',
                                () => filesApi.cloneFile(file.id)
                              )}
                              {sideAction(
                                <Trash2 size={15} color="#a03030" />,
                                'Delete…',
                                () => setDeleteTarget({ kind: 'file', file }),
                                true
                              )}
                            </Column>
                            <View className="border-subtle-border border-b" />
                            {list.length > 0 ? (
                              <>
                                <FontText variant="subtext" className="text-xs">
                                  Used in
                                </FontText>
                                <Row className="flex-wrap items-center gap-1">
                                  {list.map((p, i) => (
                                    <FilePlacementChip
                                      key={`${p.kind}-${p.fileId ?? p.owner ?? i}-${p.day ?? 0}`}
                                      placement={p}
                                      onNavigate={onNavigate}
                                      deadEnd={deadEndFor(p)}
                                    />
                                  ))}
                                </Row>
                              </>
                            ) : (
                              <FileWarnLine text={unusedLabel(file)} />
                            )}
                          </Column>
                        </ShadowScrollView>
                      </View>
                    );
                  })()}
                {/* End marker: scrollIntoView target so a newly opened
                 *  column (or the preview column) reveals on selection. */}
                <View nativeID={endMarkerDomId} style={{ width: 0, alignSelf: 'stretch' }} />
              </Row>
            </ShadowScrollView>
          ) : (
            <ContextMenuArea
              onContextMenu={(pos) => setCtxMenu({ ...pos, items: ctxNewItems(currentFolder) })}>
              <DragArea dropFolder={currentFolder}>
                <ShadowScrollView
                  className={`min-h-0 flex-1 ${dropTarget === currentFolder ? 'bg-accent/10' : ''}`}
                  scrollViewClassName="min-h-0 flex-1">
                  <Column className="gap-1.5 pb-2">
                    {renderEntries(currentFolder, 0)}
                    {(() => {
                      const entry = childrenByParent.get(currentFolder);
                      return !entry || (entry.folders.length === 0 && entry.files.length === 0) ? (
                        <Column className="items-center gap-1 py-10">
                          <Folder size={24} color="#0006" />
                          <FontText variant="subtext" className="text-sm">
                            Empty folder: create a file to get started
                          </FontText>
                        </Column>
                      ) : null;
                    })()}
                  </Column>
                </ShadowScrollView>
              </DragArea>
            </ContextMenuArea>
          )}

          {mode === 'pick' && (
            <Row className="flex-wrap justify-end gap-3">
              <AppButton variant="outline" className="h-9 w-24" onPress={() => onCancel?.()}>
                <FontText weight="medium">Cancel</FontText>
              </AppButton>
              {/* Explicit confirm so 'second click' mode (and arrow-key
               *  selection) still has a discoverable way to commit - like
               *  the Open button in a native file dialog. A sole folder
               *  selection picks the folder itself when onPickFolder is set;
               *  in column view the deepest drilled folder is the selection. */}
              {(() => {
                const soleKey = selection.keys.size === 1 ? [...selection.keys][0] : null;
                const pickFile =
                  viewMode === 'columns' && selectedFileId
                    ? (index.byId.get(selectedFileId) ?? null)
                    : soleKey?.startsWith('f:')
                      ? (index.byId.get(soleKey.slice(2)) ?? null)
                      : null;
                const pickFolderPath =
                  !pickFile && onPickFolder
                    ? viewMode === 'columns'
                      ? activeFolder || null
                      : soleKey?.startsWith('d:')
                        ? soleKey.slice(2)
                        : null
                    : null;
                return (
                  <AppButton
                    variant="filled"
                    className="w-44 max-w-full px-4 py-2"
                    disabled={!pickFile && !pickFolderPath}
                    onPress={() => {
                      if (pickFile) handleFileTap(pickFile);
                      else if (pickFolderPath) {
                        onPickFolder?.(pickFolderPath);
                        onCancel?.();
                      }
                    }}>
                    <Column className="w-full items-center gap-0.5">
                      <FontText weight="medium" color="white">
                        Choose
                      </FontText>
                      {pickFile && (
                        <PickSubtext
                          icon={fileIcon(pickFile, 12, true)}
                          text={fileLabel(pickFile)}
                        />
                      )}
                      {pickFolderPath && (
                        <PickSubtext
                          icon={<Folder size={12} color="#d8c49a" />}
                          text={folderLabel(pickFolderPath)}
                        />
                      )}
                    </Column>
                  </AppButton>
                );
              })()}
            </Row>
          )}
        </Column>
      </LoadingContainer>

      {/* name prompt (new file / new folder / rename) */}
      {/* closed dialog Roots still render an empty View that eats a flex gap
       *  in parents like the insert picker's gap-3 column - hide it */}
      <ConvexDialog.Root
        className="hidden"
        isOpen={namePrompt !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setNamePrompt(null);
        }}>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="max-w-md p-1" isSwipeable={false}>
            <CloseButton onPress={() => setNamePrompt(null)} />
            <DialogHeader text={namePrompt?.title ?? ''} />
            <Column className="gap-4 px-5 pb-5">
              <Column className="gap-1">
                <FontText weight="medium">Name</FontText>
                <FontTextInput
                  autoFocus
                  selectTextOnFocus
                  className="border-subtle-border w-full rounded-xl border px-4 py-3"
                  placeholder={namePrompt?.placeholder}
                  value={nameDraft}
                  onChangeText={(t) => {
                    setNameDraft(t);
                    setNameError(null);
                  }}
                  onSubmitEditing={submitNamePrompt}
                />
                {nameError && (
                  <FontText className="text-xs" style={{ color: '#a03030' }}>
                    {nameError}
                  </FontText>
                )}
              </Column>
              <Row className="justify-end gap-4">
                <AppButton variant="outline" className="w-24" onPress={() => setNamePrompt(null)}>
                  <FontText weight="medium">Cancel</FontText>
                </AppButton>
                <AppButton variant="filled" className="w-28" onPress={submitNamePrompt}>
                  <FontText weight="medium" color="white">
                    {namePrompt?.submitLabel ?? 'OK'}
                  </FontText>
                </AppButton>
              </Row>
            </Column>
          </ConvexDialog.Content>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>

      {/* New Tag: shared tag dialog (name + color); creating writes the tag
       *  file and opens it in the editor. */}
      <AddTagDialog
        isOpen={isNewTagOpen}
        onOpenChange={setIsNewTagOpen}
        onAdd={(name, color) => {
          const folder = newTagFolderRef.current;
          const file = filesApi.createFile(
            folder,
            filesApi.suggestName(name, folder),
            'script',
            'trigger'
          );
          if (!file) return;
          filesApi.updateFileSource(file.id, createTagFileSource(name, color));
          onOpenFile?.(file);
        }}
        existingNames={[...index.byId.values()].filter(isTagFile).map((file) => tagFileName(file))}
      />

      {/* move destination: navigable folder browser with "Move Here" */}
      <MoveToDialog
        isOpen={moveTarget !== null}
        onOpenChange={(open) => {
          if (!open) setMoveTarget(null);
        }}
        index={index}
        itemLabel={
          moveTarget?.fileId
            ? fileName(index.byId.get(moveTarget.fileId)?.path ?? '') || 'file'
            : folderLabel(moveTarget?.folderPath ?? '')
        }
        itemFolder={
          moveTarget?.fileId
            ? folderOfPath(index.byId.get(moveTarget.fileId)?.path ?? '')
            : folderOfPath(moveTarget?.folderPath ?? '')
        }
        excludePath={moveTarget?.folderPath}
        onCreateFolder={(path) => filesApi.createFolder(path)}
        onMoveHere={(dest) => {
          if (moveTarget?.fileId) filesApi.moveFile(moveTarget.fileId, dest);
          else if (moveTarget?.folderPath) filesApi.moveFolder(moveTarget.folderPath, dest);
        }}
      />

      {/* delete confirm */}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (deleteTarget?.kind === 'file') {
            filesApi.deleteFile(deleteTarget.file.id);
            if (deleteTarget.file.id === selectedFileId) setSelectedFileId(null);
          } else if (deleteTarget?.kind === 'folder') {
            filesApi.deleteFolder(deleteTarget.path);
          } else if (deleteTarget?.kind === 'multi') {
            for (const k of deleteTarget.keys) {
              if (k.startsWith('d:')) filesApi.deleteFolder(k.slice(2));
              else filesApi.deleteFile(k.slice(2));
            }
          }
          setSelection({ parent: '', keys: new Set<string>(), anchor: null });
        }}
        danger
        title={
          deleteTarget?.kind === 'file'
            ? 'Delete file?'
            : deleteTarget?.kind === 'multi'
              ? 'Delete selected items?'
              : 'Delete folder?'
        }
        message={
          deleteTarget?.kind === 'file'
            ? `"${fileName(deleteTarget.file.path)}" will be removed. ${
                isTagFile(deleteTarget.file)
                  ? 'The tag will be removed from cells that contain it.'
                  : 'Cells that include it will flag a missing file.'
              }`
            : deleteTarget?.kind === 'folder'
              ? deleteTarget.count > 0
                ? `This folder contains ${deleteTarget.count} file${deleteTarget.count === 1 ? '' : 's'}: everything inside will be deleted.`
                : `"${folderLabel(deleteTarget.path)}" will be removed.`
              : deleteTarget?.kind === 'multi'
                ? `${deleteTarget.count} selected item${deleteTarget.count === 1 ? '' : 's'} will be removed${
                    deleteTarget.keys.some((k) => k.startsWith('d:'))
                      ? ', including everything inside selected folders'
                      : ''
                  }.`
                : ''
        }
        confirmLabel="Delete"
      />

      {/* "+N more" overflow: every placement as a navigable row. */}
      <FilePlacementsModal
        isOpen={placementsFor !== null}
        onOpenChange={(open) => {
          if (!open) setPlacementsFor(null);
        }}
        title={placementsFor ? `Used in: ${fileName(placementsFor.path)}` : ''}
        placements={placementsFor ? (placements?.byFile.get(placementsFor.id) ?? []) : []}
        onNavigate={onNavigate}
        deadEndFor={deadEndFor}
      />

      {/* Right-click menu (web): portaled to the viewport so it escapes
       *  column/scroll clipping. Backdrop closes on any press; a right-click
       *  on the backdrop re-dispatches to whatever row is underneath so
       *  rapid right-clicks re-target the menu like a native one. */}
      {ctxMenu &&
        (() => {
          const MENU_W = 192;
          const estH = ctxMenu.items.length * 32 + 10;
          const left = Math.max(4, Math.min(ctxMenu.x, winDims.width - MENU_W - 8));
          const top = Math.max(4, Math.min(ctxMenu.y, winDims.height - estH - 8));
          const menuItems = ctxMenu.items.map((item, i) =>
            'divider' in item ? (
              <View key={`divider-${i}`} className="bg-border mx-1 my-1" style={{ height: 1 }} />
            ) : 'header' in item ? (
              <FontText
                key={`header-${i}`}
                variant="subtext"
                numberOfLines={1}
                className="px-2 pb-0.5 pt-1 text-[10px] uppercase">
                {item.header}
              </FontText>
            ) : (
              <Pressable
                key={item.label}
                onPress={() => {
                  setCtxMenu(null);
                  item.onPress();
                }}
                className="hover:bg-text/10 flex-row items-center gap-2 rounded px-2 py-1.5">
                {item.icon}
                <FontText
                  numberOfLines={1}
                  className="flex-1 text-[13px]"
                  style={item.danger ? { color: '#a03030' } : undefined}>
                  {item.label}
                </FontText>
                {item.checked && <Check size={13} color="#1a1a1a" />}
              </Pressable>
            )
          );
          // Native has no portal/div backdrop: a transparent Modal gives the
          // same tap-outside-to-dismiss overlay at window coords.
          if (Platform.OS !== 'web') {
            return (
              <Modal transparent visible onRequestClose={() => setCtxMenu(null)}>
                <Pressable style={{ flex: 1 }} onPress={() => setCtxMenu(null)}>
                  <View
                    className="border-subtle-border bg-background shadow-overlay rounded-md border p-1"
                    style={{ left, position: 'absolute', top, width: MENU_W }}>
                    {menuItems}
                  </View>
                </Pressable>
              </Modal>
            );
          }
          return (
            <WebDropdownPortal>
              <>
                {React.createElement('div', {
                  'aria-hidden': true,
                  onClick: (e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCtxMenu(null);
                  },
                  onMouseDown: (e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                  },
                  onContextMenu: (e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const backdrop = e.currentTarget as HTMLElement;
                    backdrop.style.pointerEvents = 'none';
                    const under = document.elementFromPoint(e.clientX, e.clientY);
                    setCtxMenu(null);
                    under?.dispatchEvent(
                      new MouseEvent('contextmenu', {
                        bubbles: true,
                        cancelable: true,
                        clientX: e.clientX,
                        clientY: e.clientY,
                        button: 2,
                      })
                    );
                  },
                  style: { inset: 0, pointerEvents: 'auto', position: 'fixed' },
                })}
                {React.createElement(
                  'div',
                  {
                    role: 'menu',
                    className:
                      'rounded-md border border-subtle-border bg-background p-1 shadow-overlay',
                    onClick: (e: React.MouseEvent) => {
                      e.preventDefault();
                      e.stopPropagation();
                    },
                    onMouseDown: (e: React.MouseEvent) => {
                      e.preventDefault();
                      e.stopPropagation();
                    },
                    style: {
                      left,
                      maxHeight: `calc(100vh - ${top + 8}px)`,
                      overflowY: 'auto',
                      pointerEvents: 'auto',
                      position: 'fixed',
                      top,
                      width: MENU_W,
                    },
                  },
                  menuItems
                )}
              </>
            </WebDropdownPortal>
          );
        })()}
    </>
  );
};

/** Modal shell around FileBrowserContent: the same UI inline pages use. */
const FileBrowserDialog = ({ isOpen, onOpenChange, ...contentProps }: FileBrowserDialogProps) => (
  <ConvexDialog.Root isOpen={isOpen} onOpenChange={onOpenChange} className="hidden">
    <ConvexDialog.Trigger asChild>
      <View />
    </ConvexDialog.Trigger>
    <ConvexDialog.Portal>
      <ConvexDialog.Overlay />
      <ConvexDialog.Content className="h-[75vh] max-w-xl" isSwipeable={false}>
        <CloseButton onPress={() => onOpenChange(false)} />
        <DialogHeader
          text={contentProps.mode === 'pick' ? 'Choose a file' : 'File Browser'}
          subtext={
            contentProps.mode === 'pick'
              ? `Pick a file${contentProps.onPickFolder ? ' or folder' : ''} to insert, or create a new one`
              : 'Select a file, then click it again to open it'
          }
        />
        <FileBrowserContent {...contentProps} onCancel={() => onOpenChange(false)} />
      </ConvexDialog.Content>
    </ConvexDialog.Portal>
  </ConvexDialog.Root>
);

export default FileBrowserDialog;
