#!/usr/bin/env node
/**
 * publish-version.mjs
 *
 * Publishes the baked CLIENT_VERSION to Convex `globals.latestClientVersion`,
 * which is what makes connected clients show the "update available" notice.
 *
 * For prod this WAITS until the live site actually serves the bundle built
 * from this commit — otherwise clients get prompted to reload while Vercel
 * is still building and just reload back into the old version.
 *
 * How the check works: vercel.json's buildCommand stamps a
 * `<meta name="wp-client-version" content="N">` tag into dist/index.html
 * (scripts/stamp-version.mjs). The live index.html exposes that tag once the
 * new deploy is serving — bundle hashes can't be compared because prod env
 * vars make Vercel's build differ from a local export.
 *
 * Usage:
 *   npm run version:publish -- --prod        # wait for Vercel, then push to prod
 *   npm run version:publish -- --prod -- --no-wait  # push immediately
 *   npm run version:publish                  # dev deployment (no wait needed)
 *
 * Options:
 *   --prod            push to the production Convex deployment
 *   --no-wait         skip the live-site check and push now
 *   --url <site>      site to poll (default: SITE_URL env or production URL)
 */

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const versionFile = join(root, 'utils', 'appVersion.ts');
const GLOBAL_KEY = 'latestClientVersion';
const DEFAULT_PROD_URL = 'https://wolffspoint.malachyf.com';
const POLL_INTERVAL_MS = 15_000;
const POLL_TIMEOUT_MS = 20 * 60_000;

const args = process.argv.slice(2);
const prod = args.includes('--prod');
const noWait = args.includes('--no-wait');
const urlArgIndex = args.indexOf('--url');
const siteUrl = urlArgIndex >= 0 ? args[urlArgIndex + 1] : process.env.SITE_URL || DEFAULT_PROD_URL;

const source = readFileSync(versionFile, 'utf8');
const match = source.match(/CLIENT_VERSION\s*=\s*(\d+)/);
if (!match) {
  console.error(`Could not find CLIENT_VERSION in ${versionFile}`);
  process.exit(1);
}
const version = Number(match[1]);

async function waitForLiveBundle() {
  console.log(`Waiting for ${siteUrl} to serve v${version}...`);
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  for (;;) {
    try {
      const res = await fetch(`${siteUrl}?cb=${Date.now()}`, {
        cache: 'no-store',
        redirect: 'follow',
      });
      const html = await res.text();
      const liveVersion = html.match(/<meta name="wp-client-version" content="(\d+)"/)?.[1];
      if (Number(liveVersion) >= version) {
        console.log(`Live site is serving v${liveVersion}.`);
        return;
      }
      process.stdout.write(
        `  live version: ${liveVersion ?? 'unstamped (pre-stamp build)'} — still waiting\n`
      );
    } catch (err) {
      process.stdout.write(`  site fetch failed (${err.message}) — still waiting\n`);
    }
    if (Date.now() > deadline) {
      console.error(
        `\nTimed out waiting for v${version} on ${siteUrl}. ` +
          `Check the Vercel deploy, then re-run or use --no-wait.`
      );
      process.exit(1);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

if (prod && !noWait) {
  await waitForLiveBundle();
}

const result = spawnSync(
  'npx',
  [
    'convex',
    'run',
    ...(prod ? ['--prod'] : []),
    'globals:set',
    JSON.stringify({ key: GLOBAL_KEY, value: version }),
  ],
  { cwd: root, stdio: 'inherit' }
);

if (result.status !== 0) {
  console.error('\nConvex push failed. Retry manually with:');
  console.error(
    `  npx convex run ${prod ? '--prod ' : ''}globals:set ` +
      `'{"key":"${GLOBAL_KEY}","value":${version}}'`
  );
  process.exit(result.status ?? 1);
}

console.log(`\nDone: clients on v${version - 1} or older will now see the reload notice.`);
