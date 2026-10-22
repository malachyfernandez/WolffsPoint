#!/usr/bin/env node
/**
 * stamp-version.mjs
 *
 * Stamps CLIENT_VERSION into dist/index.html as a meta tag after
 * `expo export --platform web` (wired into vercel.json's buildCommand).
 *
 * `version:publish` polls the live site's index.html for this tag to know
 * when Vercel is actually serving the new bundle — bundle hashes can't be
 * compared because prod env vars make Vercel's build differ from a local one.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const versionFile = join(root, 'utils', 'appVersion.ts');
const indexFile = join(root, 'dist', 'index.html');
const META_NAME = 'wp-client-version';

const match = readFileSync(versionFile, 'utf8').match(/CLIENT_VERSION\s*=\s*(\d+)/);
if (!match) {
  console.error(`Could not find CLIENT_VERSION in ${versionFile}`);
  process.exit(1);
}

let html;
try {
  html = readFileSync(indexFile, 'utf8');
} catch {
  console.error(`No ${indexFile} — run this after \`expo export --platform web\`.`);
  process.exit(1);
}

const meta = `<meta name="${META_NAME}" content="${match[1]}"/>`;
const stamped = html.match(new RegExp(`<meta name="${META_NAME}"[^/]*/>`))
  ? html.replace(new RegExp(`<meta name="${META_NAME}"[^/]*/>`), meta)
  : html.replace('</head>', `${meta}</head>`);

if (stamped === html && !html.includes(meta)) {
  console.error(`Could not inject the version meta tag into ${indexFile}`);
  process.exit(1);
}

writeFileSync(indexFile, stamped);
console.log(`Stamped ${META_NAME}=${match[1]} into dist/index.html`);
