const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

const config = getDefaultConfig(__dirname);

// Sim mode (`EXPO_PUBLIC_SIM=1`): transparently swap the real Convex/Clerk
// client modules for the in-memory mocks in sim/. This is a bundle-time
// module-resolution redirect — app source never changes, and with the flag
// off nothing here is touched. See sim/README.md.
if (process.env.EXPO_PUBLIC_SIM === '1') {
  const path = require('path');
  const originalResolve = config.resolver.resolveRequest;
  const redirects = {
    'convex/react': path.resolve(__dirname, 'sim/mockConvexReact.ts'),
    'convex/react-clerk': path.resolve(__dirname, 'sim/mockConvexReact.ts'),
    '@clerk/clerk-expo': path.resolve(__dirname, 'sim/mockClerk.tsx'),
  };
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    const target = redirects[moduleName];
    // Never redirect sim's own imports (guards against a mock needing a real
    // Convex util → self-alias recursion).
    if (target && !context.originModulePath.includes(`${path.sep}sim${path.sep}`)) {
      return { type: 'sourceFile', filePath: target };
    }
    return originalResolve
      ? originalResolve(context, moduleName, platform)
      : context.resolveRequest(context, moduleName, platform);
  };
}

module.exports = withUniwindConfig(config, {
  cssEntryFile: './global.css',
  dtsFile: './uniwind-types.d.ts',
});
