import assert from 'node:assert/strict';
import { test } from 'node:test';
import JSZip from 'jszip';
import {
  buildFilesIndex,
  createTagFileSource,
  docWithFile,
  docWithFolder,
  getTagMeta,
  isTagFile,
  type ScriptFile,
  type ScriptFilesDoc,
} from '../utils/scriptFiles';
import {
  buildFolderArchive,
  FOLDER_ARCHIVE_MANIFEST,
  parseFolderArchiveManifest,
  planFolderImport,
  type FolderArchivePayload,
} from '../utils/scriptFolderArchive';

const file = (id: string, path: string, extra: Partial<ScriptFile> = {}): ScriptFile => ({
  id,
  path,
  kind: 'script',
  role: 'display',
  source: 'Return players;',
  updatedAt: 1,
  ...extra,
});

/** The hook's import commit, duplicated here so plan output is verified the
 *  way the real doc mutation applies it. */
const applyPlan = (
  doc: ScriptFilesDoc,
  plan: ReturnType<typeof planFolderImport>
): ScriptFilesDoc => {
  const folders = new Map(doc.folders.map((f) => [f.toLowerCase(), f]));
  for (const f of plan.folders) folders.set(f.toLowerCase(), f);
  let next: ScriptFilesDoc = {
    ...doc,
    folders: [...folders.values()],
    folderIds: { ...doc.folderIds, ...plan.folderIds },
  };
  next = docWithFolder(next, plan.rootPath);
  for (const f of plan.files) next = docWithFile(next, f);
  return next;
};

const roundTrip = (
  doc: ScriptFilesDoc,
  folder: string,
  into: { doc: ScriptFilesDoc; parent: string }
): ScriptFilesDoc => {
  const payload = buildFolderArchive(doc, folder);
  const parsed = parseFolderArchiveManifest(JSON.parse(JSON.stringify(payload.manifest)));
  const plan = planFolderImport(
    { manifest: parsed, sources: payload.sources },
    into.doc,
    into.parent
  );
  return applyPlan(into.doc, plan);
};

const doc: ScriptFilesDoc = {
  files: {
    f_a: file('f_a', 'pack/Alpha', { kind: 'markdown', role: undefined }),
    f_b: file('f_b', 'pack/Beta', {
      role: 'trigger',
      source: 'File({PATH = "pack/Alpha", ID = "f_a"});',
    }),
    f_c: file('f_c', 'pack/sub/Gamma', {
      source:
        'Folder({ID = "folder_sub", PATH = "pack/sub", ORDER = ["f_c", "f_b"], HIDDEN = ["f_a"]});',
    }),
    f_out: file('f_out', 'elsewhere/Outside'),
  },
  folders: ['pack', 'pack/sub', 'pack/empty', 'elsewhere'],
  folderIds: {
    folder_pack: 'pack',
    folder_sub: 'pack/sub',
    folder_empty: 'pack/empty',
  },
};

test('export carries every folder, file field, and source', () => {
  const { manifest, sources } = buildFolderArchive(doc, 'pack');
  assert.equal(manifest.name, 'pack');
  assert.equal(manifest.root, 'pack');
  assert.deepEqual([...manifest.folders].sort(), ['', 'empty', 'sub']);
  assert.deepEqual(manifest.folderIds, {
    folder_pack: '',
    folder_sub: 'sub',
    folder_empty: 'empty',
  });
  assert.equal(manifest.files.length, 3);
  for (const entry of manifest.files) {
    assert.ok(sources[entry.entry] !== undefined, `missing source for ${entry.path}`);
    assert.equal(sources[entry.entry], doc.files[entry.id].source);
  }
  const alpha = manifest.files.find((f) => f.path === 'Alpha')!;
  assert.equal(alpha.kind, 'markdown');
  assert.equal(alpha.role, undefined);
  const beta = manifest.files.find((f) => f.path === 'Beta')!;
  assert.equal(beta.role, 'trigger');
});

test('round-trip into an empty doc preserves everything verbatim', () => {
  const target: ScriptFilesDoc = {
    files: { f_keep: file('f_keep', 'other/Keep') },
    folders: ['other'],
  };
  const next = roundTrip(doc, 'pack', { doc: target, parent: '' });
  const index = buildFilesIndex(next);

  for (const f of ['pack', 'pack/sub', 'pack/empty']) {
    assert.ok(index.folders.includes(f), `missing folder ${f}`);
  }
  // Unrelated content survives.
  assert.ok(index.byPath.has('other/keep'));

  for (const id of ['f_a', 'f_b', 'f_c']) {
    const imported = index.byId.get(id)!;
    assert.ok(imported, `missing file ${id}`);
    assert.equal(imported.source, doc.files[id].source);
    assert.equal(imported.kind, doc.files[id].kind);
    assert.equal(imported.role, doc.files[id].role);
  }
  assert.deepEqual(next.folderIds?.folder_pack, 'pack');
  assert.deepEqual(next.folderIds?.folder_sub, 'pack/sub');
  assert.deepEqual(next.folderIds?.folder_empty, 'pack/empty');
});

test('id collisions remap and rewrite internal refs', () => {
  const clash = file('f_a', 'other/PreExisting');
  const target: ScriptFilesDoc = { files: { f_a: clash }, folders: ['other'] };
  const payload = buildFolderArchive(doc, 'pack');
  const plan = planFolderImport(payload, target, '');
  const next = applyPlan(target, plan);
  const index = buildFilesIndex(next);

  const imported = index.byPath.get('pack/alpha')!;
  assert.ok(imported);
  assert.notEqual(imported.id, 'f_a');
  // The pre-existing file keeps its id.
  assert.equal(index.byId.get('f_a')!.path, 'other/PreExisting');
  // The File({ID}) ref inside Beta now points at the remapped id.
  assert.ok(
    index.byPath.get('pack/beta')!.source.includes(`ID = "${imported.id}"`),
    index.byPath.get('pack/beta')!.source
  );
  // ORDER/HIDDEN id lists are rewritten too.
  const gamma = index.byPath.get('pack/sub/gamma')!;
  assert.ok(gamma.source.includes(`"${imported.id}"`), gamma.source);
  assert.ok(gamma.source.includes('"f_b"'), gamma.source);
});

test('folder name collision produces a sibling, not a merge', () => {
  const target: ScriptFilesDoc = { files: {}, folders: ['pack', 'pack/sub'] };
  const next = roundTrip(doc, 'pack', { doc: target, parent: '' });
  const index = buildFilesIndex(next);
  assert.ok(index.folders.includes('pack 2'));
  assert.ok(index.byPath.has('pack 2/alpha'));
  assert.ok(index.byPath.has('pack 2/sub/gamma'));
  assert.ok(index.folders.includes('pack 2/empty'));
  // PATH refs inside imported sources point at the new root.
  assert.ok(index.byPath.get('pack 2/beta')!.source.includes('PATH = "pack 2/Alpha"'));
  const gamma = index.byPath.get('pack 2/sub/gamma')!;
  assert.ok(gamma.source.includes('PATH = "pack 2/sub"'));
});

test('importing a tags export merges into the pinned tags folder', () => {
  const tagsDoc: ScriptFilesDoc = {
    files: {
      f_tag: file('f_tag', 'tags/Suspicious', {
        source: createTagFileSource('Suspicious', '#ff0044', 'Return true;'),
      }),
    },
    folders: ['tags'],
  };
  const target: ScriptFilesDoc = {
    files: {
      f_keep: file('f_keep', 'tags/Known', { source: createTagFileSource('Known', '#00ff00') }),
    },
    folders: ['tags'],
  };
  const next = roundTrip(tagsDoc, 'tags', { doc: target, parent: '' });
  const index = buildFilesIndex(next);
  const imported = index.byPath.get('tags/suspicious')!;
  assert.ok(imported, 'tag file should land in tags/');
  assert.ok(isTagFile(imported));
  assert.deepEqual(getTagMeta(imported), { name: 'Suspicious', color: '#ff0044' });
  assert.ok(index.byPath.has('tags/known'), 'existing tags preserved');
});

test('refs pointing outside the export are left untouched', () => {
  const withOutRef: ScriptFilesDoc = {
    files: {
      f_in: file('f_in', 'pack/Alpha'),
      f_ref: file('f_ref', 'pack/UsesOutside', {
        source: 'File({PATH = "elsewhere/Outside", ID = "f_out"});',
      }),
      f_out: file('f_out', 'elsewhere/Outside'),
    },
    folders: ['pack', 'elsewhere'],
  };
  const next = roundTrip(withOutRef, 'pack', { doc: { files: {}, folders: [] }, parent: '' });
  const source = buildFilesIndex(next).byPath.get('pack/usesoutside')!.source;
  assert.ok(source.includes('"elsewhere/Outside"'));
  assert.ok(source.includes('"f_out"'));
});

test('zip round-trip via JSZip preserves the archive', async () => {
  const { manifest, sources } = buildFolderArchive(doc, 'pack');
  const zip = new JSZip();
  zip.file(FOLDER_ARCHIVE_MANIFEST, JSON.stringify(manifest, null, 2));
  for (const [entry, source] of Object.entries(sources)) zip.file(entry, source);
  const blob = await zip.generateAsync({ type: 'nodebuffer' });

  const loaded = await JSZip.loadAsync(blob);
  const parsed = parseFolderArchiveManifest(
    JSON.parse(await loaded.file(FOLDER_ARCHIVE_MANIFEST)!.async('string'))
  );
  const readSources: Record<string, string> = {};
  for (const entry of parsed.files) {
    readSources[entry.entry] = await loaded.file(entry.entry)!.async('string');
  }
  const payload: FolderArchivePayload = { manifest: parsed, sources: readSources };
  const next = applyPlan(
    { files: {}, folders: [] },
    planFolderImport(payload, { files: {}, folders: [] }, '')
  );
  const index = buildFilesIndex(next);
  assert.equal(index.byPath.get('pack/alpha')!.source, doc.files.f_a.source);
  assert.equal(index.byPath.get('pack/sub/gamma')!.source, doc.files.f_c.source);
});

test('nested destination path and deep nesting round-trip', () => {
  const next = roundTrip(doc, 'pack', { doc: { files: {}, folders: ['dest'] }, parent: 'dest' });
  const index = buildFilesIndex(next);
  assert.ok(index.byPath.has('dest/pack/alpha'));
  assert.ok(index.byPath.has('dest/pack/sub/gamma'));
  assert.ok(index.folders.includes('dest/pack/empty'));
  assert.ok(
    index.byPath.get('dest/pack/beta')!.source.includes('PATH = "dest/pack/Alpha"'),
    'PATH refs must follow the imported root'
  );
});

test('manifest validation rejects malformed archives', () => {
  const { manifest } = buildFolderArchive(doc, 'pack');
  assert.throws(() => parseFolderArchiveManifest(null), /missing manifest/);
  assert.throws(
    () => parseFolderArchiveManifest({ ...manifest, format: 'other' }),
    /unrecognized manifest format/
  );
  assert.throws(
    () => parseFolderArchiveManifest({ ...manifest, version: 99 }),
    /unsupported archive version/
  );
  assert.throws(
    () =>
      parseFolderArchiveManifest({
        ...manifest,
        files: [{ id: 'x', path: 'x', entry: 'e', kind: 'mystery' }],
      }),
    /unknown file kind/
  );
});
