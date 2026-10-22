#!/usr/bin/env node
/**
 * bump-version.mjs
 *
 * Releases a new app version:
 *   1. Increments CLIENT_VERSION in utils/appVersion.ts
 *   2. Pushes the new value to the Convex `globals` table as `latestClientVersion`
 *
 * Any client running an older bundle will see the "update available" notice
 * in the bottom-left corner until they reload.
 *
 * Usage:
 *   npm run version:bump                  # bump + push to the dev deployment
 *   npm run version:bump -- --prod        # bump only — publish after Vercel is
 *                                         # live via `npm run version:publish -- --prod`
 *   npm run version:bump -- --no-push     # bump the file only
 *   npm run version:bump -- --prod --push # bump + push to prod immediately
 *                                         # (clients may reload into the old
 *                                         # bundle while Vercel still builds)
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const versionFile = join(root, 'utils', 'appVersion.ts');
const GLOBAL_KEY = 'latestClientVersion';

const args = process.argv.slice(2);
const prod = args.includes('--prod');
const push = args.includes('--push');
// Prod pushes through version:publish after Vercel is serving the new bundle;
// only `--push` overrides that. Dev pushes immediately (local dev server always
// serves the latest bundle).
const noPush = args.includes('--no-push') || (prod && !push);

const source = readFileSync(versionFile, 'utf8');
const match = source.match(/CLIENT_VERSION\s*=\s*(\d+)/);
if (!match) {
  console.error(`Could not find CLIENT_VERSION in ${versionFile}`);
  process.exit(1);
}

const next = Number(match[1]) + 1;
writeFileSync(versionFile, source.replace(/CLIENT_VERSION\s*=\s*\d+/, `CLIENT_VERSION = ${next}`));
console.log(`CLIENT_VERSION bumped to ${next} in utils/appVersion.ts`);

if (noPush) {
  if (prod && !args.includes('--no-push')) {
    console.log('Prod publish deferred until Vercel is live. Release steps:');
    console.log('  1. commit + push this bump');
    console.log('  2. npm run version:publish -- --prod   (waits for the live site, then pushes)');
  } else {
    console.log('Skipped Convex push (--no-push). To publish later, run:');
    console.log(
      `  npx convex run ${prod ? '--prod ' : ''}globals:set '{"key":"${GLOBAL_KEY}","value":${next}}'`
    );
  }
  process.exit(0);
}

const result = spawnSync(
  'npx',
  [
    'convex',
    'run',
    ...(prod ? ['--prod'] : []),
    'globals:set',
    JSON.stringify({ key: GLOBAL_KEY, value: next }),
  ],
  { cwd: root, stdio: 'inherit' }
);

if (result.status !== 0) {
  console.error('\nConvex push failed. The file was bumped; publish manually with:');
  console.error(
    `  npx convex run ${prod ? '--prod ' : ''}globals:set '{"key":"${GLOBAL_KEY}","value":${next}}'`
  );
  process.exit(result.status ?? 1);
}

console.log(`\nDone: clients on v${next - 1} or older will now see the reload notice.`);
