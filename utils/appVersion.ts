/**
 * App Versioning
 * --------------
 * `CLIENT_VERSION` is the version of the currently running client bundle. It is
 * baked into the build, so every loaded client "knows" its own version.
 *
 * The server keeps the newest released version in the `globals` table under
 * `LATEST_VERSION_GLOBAL_KEY`. When the server's value is higher than the
 * client's, `useAppVersionStatus()` reports `isOutdated` and the app shows a
 * reload prompt in the bottom-left corner until the user reloads.
 *
 * HOW TO RELEASE A NEW VERSION (bumps this file AND pushes to Convex):
 *   npm run version:bump          # dev deployment
 *   npm run version:bump -- --prod # production deployment
 *
 * Or manually:
 *   1. Increment CLIENT_VERSION below.
 *   2. npx convex run globals:set '{"key":"latestClientVersion","value":<N>}'
 *      (add --prod for the production deployment)
 *
 * See utils/about-parts-of-this-codebase/versioning-system.md for details.
 */
export const CLIENT_VERSION = 3;

/** Key in the Convex `globals` table holding the newest released client version. */
export const LATEST_VERSION_GLOBAL_KEY = 'latestClientVersion';
